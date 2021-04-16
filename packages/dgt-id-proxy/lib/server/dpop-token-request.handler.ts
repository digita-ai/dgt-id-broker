import { join } from 'path';
import { readFile } from 'fs/promises';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, from, throwError, combineLatest } from 'rxjs';
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
  ) {
    super();

    if(!handler){
      throw new Error('A HttpHandler must be provided');
    }

    keyValueStore.set('jtis', []);
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
      let jwk: JWK;
      return combineLatest(
        from(
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
        ),
        from(this.keyValueStore.get('jtis')),
      ).pipe(
        switchMap(([ { payload, protectedHeader }, jtis ]) => {
          jwk = protectedHeader.jwk as JWK;

          if (!payload.jti || typeof payload.jti !== 'string') {
            throw new Error(JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'must have a jti string property' }));
          }

          if (jtis?.includes(payload.jti)){
            throw new Error(JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'jti must be unique' }));
          }

          jtis?.push(payload.jti);
          if (jtis) {
            this.keyValueStore.set('jtis', jtis);
          }

          if (payload.htm !== context.request.method) {
            throw new Error(JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'htm does not match the request method' }));
          }

          // TO DO: FIX HARDCODED URL
          if (payload.htu !== 'http://localhost:3003/token') {
            throw new Error(JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'htu does not match' }));
          }

          delete context.request.headers.dpop;
          return this.handler.handle(context);
        }),
        switchMap((response) => {
          const parsedBody = JSON.parse(response.body);
          if (parsedBody.error) {
            throw new Error(response.body);
          }
          return combineLatest(
            of(response),
            from(calculateThumbprint(jwk)),
            from(readFile(join(process.cwd(), this.pathToJwks))),
          );
        }),
        switchMap(([ response, thumbprint, file ]) => {
          const jwks = JSON.parse((file.toString()));

          return combineLatest(
            of(response),
            of(jwks.keys[0]),
            from(parseJwk(jwks.keys[0])),
            of(thumbprint),
          );
        }),
        switchMap(([ response, serverJwk, serverJwkAsKeyLike, thumbprint ]) => {
          const parsedBody = JSON.parse(response.body);
          const accessTokenPayload = parsedBody.access_token.split('.')[1];
          const decodedAccessTokenPayload = JSON.parse(decode(accessTokenPayload).toString());
          decodedAccessTokenPayload.cnf = { 'jkt': thumbprint };

          return combineLatest(
            of(response),
            from(new SignJWT(decodedAccessTokenPayload as JWTPayload)
              .setProtectedHeader({ alg: serverJwk.alg, typ: 'at+jwt', kid: serverJwk.kid })
              // TO DO: Fix hardcoded URL
              .setIssuer('http://localhost:3003')
              .sign(serverJwkAsKeyLike)),
          );
        }),
        switchMap(([ response, dpopBoundAccessToken ]) => {
          const parsedBody = JSON.parse(response.body);
          parsedBody.token_type = 'DPoP';
          parsedBody.access_token = dpopBoundAccessToken;
          return of({
            body: JSON.stringify(parsedBody),
            headers: {
              'access-control-allow-origin': context.request.headers.origin,
              'access-control-allow-headers': 'dpop',
              'Content-Type':  'application/json',
            },
            status: 200,
          });
        }),
        catchError((error) => of ({
          body: error.message,
          headers: { 'access-control-allow-origin': context.request.headers.origin },
          status: 400,
        })),
      );
    } else {
      return this.handler.handle(context);
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
}
