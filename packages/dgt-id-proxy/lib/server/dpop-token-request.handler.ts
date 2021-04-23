import { join } from 'path';
import { readFile } from 'fs/promises';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { of, from, throwError, combineLatest, Observable } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { EmbeddedJWK } from 'jose/jwk/embedded';
import { calculateThumbprint } from 'jose/jwk/thumbprint';
import { jwtVerify } from 'jose/jwt/verify';
import { JWK, JWTPayload } from 'jose/webcrypto/types';
import { decode } from 'jose/util/base64url';
import { SignJWT } from 'jose/jwt/sign';
import { parseJwk } from 'jose/jwk/parse';
import { InMemoryStore } from '../storage/in-memory-store';

/**
 *
 */
export class DpopTokenRequestHandler extends HttpHandler {
  /**
   * Creates a {DpopTokenRequestHandler} passing requests through the given handler.
   *
   * @param {HttpHandler} handler - the handler through which to pass incoming requests.
   */
  constructor(
    private handler: HttpHandler,
    private keyValueStore: InMemoryStore<string, string[]>,
    private pathToJwks: string,
    private proxyUrl: string,
  ) {
    super();

    if(!handler){
      throw new Error('A HttpHandler must be provided');
    }

    if(!keyValueStore){
      throw new Error('A keyValueStore must be provided');
    }

    if(!pathToJwks){
      throw new Error('A pathToJwks must be provided');
    }

    if(!proxyUrl){
      throw new Error('A proxyUrl must be provided');
    }
  }

  /**
   *
   */
  handle(context: HttpHandlerContext) {
    if (!context) {
      return throwError(new Error('Context cannot be null or undefined'));
    }

    if (!context.request) {
      return throwError(new Error('No request was included in the context'));
    }

    if (!context.request.method) {
      return throwError(new Error('No method was included in the request'));
    }

    if (!context.request.headers) {
      return throwError(new Error('No headers were included in the request'));
    }

    if (!context.request.url) {
      return throwError(new Error('No url was included in the request'));
    }

    if (context.request.method === 'POST') {
      if (!context.request.headers.dpop) {
        return of({
          body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'DPoP header missing on the request.' }),
          headers: { 'access-control-allow-origin': context.request.headers.origin },
          status: 400,
        });
      }

      const dpopJWT = context.request.headers.dpop;

      const decodedDpopJwt = from(
        jwtVerify(
          dpopJWT,
          EmbeddedJWK,
          {
            maxTokenAge: `60 seconds`,
            typ: 'dpop+jwt',
            algorithms: [
              'RS256',
              'PS256',
              'ES256',
              'EdDSA',
            ],
          },
        ),
      );

      const responseAfterVerification = decodedDpopJwt.pipe(
        switchMap(({ payload }) => this.verifyDpopProof(context, payload)),
        catchError((error) => throwError({
          body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: error.message }),
          headers: { 'access-control-allow-origin': context.request.headers.origin },
          status: 400,
        })),
        switchMap(() => {
          // if the observable completes, remove the dpop header from the request and pass it on to the handler
          delete context.request.headers.dpop;
          return this.handler.handle(context);
        }),
        // if the observable was rejected during the verification process create an error response.
        switchMap((response) => response.status === 200 ? of(response) : throwError(response)),
      );

      const clientJwk = decodedDpopJwt.pipe(map(({ protectedHeader }) => protectedHeader.jwk as JWK));
      const jwkFile = from(readFile(join(process.cwd(), this.pathToJwks)));

      const jwksAndThumbprint = combineLatest(jwkFile, clientJwk).pipe(
        switchMap(([ file, jwk ]) => {
          const jwks = JSON.parse((file.toString()));

          const rawJwk = of(jwks.keys[0]);
          const parsedJwk = from(parseJwk(jwks.keys[0]));

          return combineLatest(
            rawJwk,
            parsedJwk,
            from(calculateThumbprint(jwk)),
          );
        }),
      );

      return combineLatest(jwksAndThumbprint, responseAfterVerification).pipe(
        switchMap(([ [ serverJwk, serverJwkAsKeyLike, thumbprint ], response ]) => {
          const dpopAccessTokenPayload = this.createDpopAccessTokenPayload(response.body, thumbprint);

          const dpopBoundAccessToken = from(new SignJWT(dpopAccessTokenPayload)
            .setProtectedHeader({ alg: serverJwk.alg, typ: 'at+jwt', kid: serverJwk.kid })
            .setIssuer(this.proxyUrl)
            .sign(serverJwkAsKeyLike));

          return combineLatest(
            of(response),
            dpopBoundAccessToken,
          );
        }),
        switchMap(([ response, dpopBoundAccessToken ]) => this.createDpopResponse(
          response,
          dpopBoundAccessToken,
          context.request.headers.origin,
        )),
        catchError((error) =>
          // TODO: Fix this. This is probably not the right way to go about it. This catches the throwError(response) on line 102
          // but we aren't sure that it's actually of the type HttpHandlerResponse
          error.body && error.headers && error.status ? of(error) : throwError(error)),
      );
    } else if (context.request.method === 'OPTIONS') {
      return this.handler.handle(context);
    } else {
      return throwError(new MethodNotAllowedHttpError('this method is not supported.'));
    }
  }

  /**
   *
   */
  canHandle(context: HttpHandlerContext) {
    return context
      && context.request
      && context.request.method
      && context.request.headers
      && context.request.url
      ? of(true)
      : of(false);
  }

  private verifyDpopProof(context: HttpHandlerContext, payload: JWTPayload): Observable<unknown> {

    // check the parameters, and throw an error if they are missing
    if (!payload.jti || typeof payload.jti !== 'string') {
      return throwError(new Error('must have a jti string property'));
    }

    if (payload.htm !== context.request.method) {
      return throwError(new Error('htm does not match the request method'));
    }

    if (payload.htu !== this.proxyUrl + '/token') {
      return throwError(new Error('htu does not match'));
    }

    const jti = payload.jti;

    return from(this.keyValueStore.get('jtis')).pipe(
      switchMap((jtis) => {
        if (jtis?.includes(jti)) {
          return throwError(new Error('jti must be unique'));
        }
        this.keyValueStore.set('jtis', jtis ? [ ...jtis, jti ] : [ jti ]);
        return of({});
      }),
    );
  }

  private createDpopAccessTokenPayload(responseBody: string, clientPublicKeyThumbprint: string): JWTPayload {
    const parsedBody = JSON.parse(responseBody);
    // split the access token into header, payload, and footer parts, then get the payload
    const accessTokenPayload = parsedBody.access_token.split('.')[1];
    // base64url decode the access token payload
    const decodedAccessTokenPayload = JSON.parse(decode(accessTokenPayload).toString());
    // set the cnf claim
    decodedAccessTokenPayload.cnf = { 'jkt': clientPublicKeyThumbprint };

    return decodedAccessTokenPayload;
  }

  private createDpopResponse(response: HttpHandlerResponse, dpopBoundAccessToken: string, corsOrigin: string) {
    const parsedBody = JSON.parse(response.body);
    parsedBody.token_type = 'DPoP';
    parsedBody.access_token = dpopBoundAccessToken;
    return of({
      body: JSON.stringify(parsedBody),
      headers: {
        'access-control-allow-origin': corsOrigin,
        'access-control-allow-headers': 'dpop',
        'Content-Type':  'application/json',
      },
      status: 200,
    });
  }
}
