import { join } from 'path';
import { readFile } from 'fs/promises';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { of, from, throwError, combineLatest, zip, Observable } from 'rxjs';
import { switchMap, map, catchError, withLatestFrom, switchMapTo, tap } from 'rxjs/operators';
import { EmbeddedJWK } from 'jose/jwk/embedded';
import { calculateThumbprint } from 'jose/jwk/thumbprint';
import { jwtVerify } from 'jose/jwt/verify';
import { JWK, JWSHeaderParameters, JWTPayload, JWTVerifyResult } from 'jose/webcrypto/types';
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

    if (context.request.method === 'OPTIONS') {
      return this.handler.handle(context);
    }

    if (context.request.method !== 'POST') {
      return throwError(new MethodNotAllowedHttpError('this method is not supported.'));
    }

    if (!context.request.headers.dpop) {
      return of({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'DPoP header missing on the request.' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      });
    }

    const { dpop, ... noDpopHeaders } = context.request.headers;

    const noDpopRequestContext = {
      ... context,
      request: {
        ... context.request,
        headers: noDpopHeaders,
      },
    };

    const verifyOptions = {
      maxTokenAge: `60 seconds`,
      typ: 'dpop+jwt',
      algorithms: [
        'RS256',
        'PS256',
        'ES256',
        'EdDSA',
      ],
    };

    return from(jwtVerify(dpop, EmbeddedJWK, verifyOptions)).pipe(
      // verifies or errors with dpop message
      switchMap((jwt) => this.verifyDpopProof(context.request.method, jwt)),
      // creates thumbprint or errors
      switchMap((verified) => from(calculateThumbprint(verified.protectedHeader.jwk))),
      // builds error body around previous errors
      catchError((error) => throwError(this.dpopError(error?.message ?? 'could not create thumbprint from dpop proof', context))),
      // gets successful response or errors with body
      switchMap((thumbprint) => zip(of(thumbprint), this.getUpstreamResponse(noDpopRequestContext))),
      // creates dpop bound token
      switchMap(([ thumbprint, response ]) => zip(of(response), this.createToken(response.body, thumbprint))),
      // creates dpop response
      switchMap(([ response, token ]) => this.createDpopResponse(response, token, context.request.headers.origin)),
      // switches any errors with body into responses; all the rest are server errors which will hopefully be catched higher
      catchError((error) => error.body && error.headers && error.status ? of(error) : throwError(error)),
    );

  }

  private verifyDpopProof(
    method: string, { payload, protectedHeader: header }: JWTVerifyResult,
  ): Observable<JWTVerifyResult & { protectedHeader: { jwk: Pick<JWK, 'kty' | 'crv' | 'x' | 'y' | 'e' | 'n'> } }> {

    const jwk = header.jwk;

    if (!jwk) {
      return throwError(new Error('must have a jti string property'));
    }

    if (!payload.jti || typeof payload.jti !== 'string') {
      return throwError(new Error('must have a jti string property'));
    }

    if (payload.htm !== method) {
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
        return of({ payload, protectedHeader: { ... header, jwk } });
      }),
    );
  }

  private dpopError = (error_description: string, context: HttpHandlerContext) => ({
    body: JSON.stringify({
      error: 'invalid_dpop_proof',
      error_description,
    }),
    headers: { 'access-control-allow-origin': context.request.headers.origin },
    status: 400,
  });

  private getUpstreamResponse = (context: HttpHandlerContext) => this.handler.handle(context).pipe(
    switchMap((response) => response.status === 200 ? of(response) : throwError(response)),
  );

  private getSigningKit = () => from(readFile(join(process.cwd(), this.pathToJwks))).pipe(
    switchMap<Buffer, JWK>((keyFile) => of(JSON.parse(keyFile.toString()).keys[0])),    // I would like to see some safer way than casting after a read
    switchMap((jwk) => zip(of(jwk.alg), of(jwk.kid), from(parseJwk(jwk)))),
  );

  private signJwtPayload = (jwtPayload: JWTPayload) => zip(of(jwtPayload), this.getSigningKit()).pipe(
    switchMap(([ payload, [ alg, kid, key ] ]) => from(
      new SignJWT(payload)
        .setProtectedHeader({ alg, kid, typ: 'at+jwt'  })
        .setIssuer(this.proxyUrl)
        .sign(key),
    )),
  );

  private createToken(responseBody: string, clientPublicKeyThumbprint: string): Observable<string> {
    const parsedBody = JSON.parse(responseBody);
    // split the access token into header, payload, and footer parts, then get the payload
    const accessTokenPayload = parsedBody.access_token.split('.')[1];
    // base64url decode the access token payload
    const decodedAccessTokenPayload = JSON.parse(decode(accessTokenPayload).toString());
    // set the cnf claim
    decodedAccessTokenPayload.cnf = { 'jkt': clientPublicKeyThumbprint };

    return this.signJwtPayload(decodedAccessTokenPayload);

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

}
