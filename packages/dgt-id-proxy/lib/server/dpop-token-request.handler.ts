import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, from, throwError, combineLatest } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { EmbeddedJWK } from 'jose/jwk/embedded';
import { calculateThumbprint } from 'jose/jwk/thumbprint';
import { jwtVerify } from 'jose/jwt/verify';
import { JWK } from 'jose/webcrypto/types';
import { decode } from 'jose/util/base64url';
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
  constructor(private handler: HttpHandler, private keyValueStore: InMemoryStore<string, string[]>) {
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

    if (!context.request.path) {
      return throwError(new Error('No path was included in the request'));
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
          return combineLatest(of(response), from(calculateThumbprint(jwk)));
        }),
        switchMap(([ response, thumbprint ]) => {
          const parsedBody = JSON.parse(response.body);
          const accessTokenPayload = parsedBody.access_token.split('.')[1];
          const decodedAccessTokenPayload = JSON.parse(decode(accessTokenPayload).toString());
          decodedAccessTokenPayload.iss = 'http://localhost:3003';
          decodedAccessTokenPayload.cnf = { 'jkt': thumbprint };
          console.log(decodedAccessTokenPayload);
          console.log(process.cwd());

          return of(response);
        }),
        catchError((error) => {
          console.log(error);
          return of ({
            body: error.message,
            headers: { 'access-control-allow-origin': context.request.headers.origin },
            status: 400,
          });
        }),
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
      && context.request.path
      ? of(true)
      : of(false);
  }
}
