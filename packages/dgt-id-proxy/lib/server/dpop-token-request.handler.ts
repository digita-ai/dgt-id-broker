import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, from, throwError, zip, Observable } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { EmbeddedJWK, calculateJwkThumbprint, jwtVerify, JWTVerifyOptions, JWK, JWTVerifyResult } from 'jose';
import { InMemoryStore } from '../storage/in-memory-store';

/**
 * A {HttpHandler} that handles DPoP requests for an upstream server that does not support them
 * and returns a valid DPoP bound token to the user upon success.
 */
export class DpopTokenRequestHandler extends HttpHandler {

  /**
   * Creates a {DpopTokenRequestHandler} passing requests through the given handler.
   *
   * @param {HttpHandler} handler - the handler through which to pass incoming requests.
   * @param {InMemoryStore<string, string[]>} keyValueStore - the KeyValueStore in which to save jti's.
   * @param {string} proxyTokenUrl - the url of the proxy server's token endpoint.
   * @param {number} clockTolerance - tolerance in seconds that a token will still be considered valid if it is
   * either too old or too new. Should prevent tokens from being rejected due to clock skews between servers and clients.
   * 10 seconds by default.
   * @param {number} maxDpopProofTokenAge - maximum age in seconds at which a DPoP proof token will be considered valid. Default of 1 minute.
   */
  constructor(
    private handler: HttpHandler,
    private keyValueStore: InMemoryStore<string, string[]>,
    private proxyTokenUrl: string,
    private clockTolerance: number = 10,
    private maxDpopProofTokenAge: number = 60
  ) {

    super();

    if (!handler) { throw new Error('A HttpHandler must be provided'); }

    if (!keyValueStore) { throw new Error('A keyValueStore must be provided'); }

    if (!proxyTokenUrl) { throw new Error('A proxyTokenUrl must be provided'); }

    if (clockTolerance < 0) { throw new Error('clockTolerance cannot be negative.'); }

    if (maxDpopProofTokenAge <= 0) { throw new Error('maxDpopProofTokenAge must be greater than 0.'); }

  }

  /**
   * Handles the context's incoming request. If the request is a valid DPoP request it will send a DPoP-less request
   * to the upstream server and modify the Access Token to be a valid DPoP bound Access Token.
   * Otherwise it will return error responses as specified by the DPoP proof spec otherwise.
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse>{

    if (!context) { return throwError(() => new Error('Context cannot be null or undefined')); }

    if (!context.request) { return throwError(() => new Error('No request was included in the context')); }

    if (!context.request.method) { return throwError(() => new Error('No method was included in the request')); }

    if (!context.request.headers) { return throwError(() => new Error('No headers were included in the request')); }

    if (!context.request.url) { return throwError(() => new Error('No url was included in the request')); }

    if (!context.request.headers.dpop) {

      return of({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'DPoP header missing on the request.' }),
        headers: { },
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

    const verifyOptions: JWTVerifyOptions = {
      maxTokenAge: this.maxDpopProofTokenAge,
      clockTolerance: this.clockTolerance,
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
      switchMap((verified) => from(calculateJwkThumbprint(verified.protectedHeader.jwk))),
      // builds error body around previous errors
      catchError((error) => error.message ? throwError(() => this.dpopError(error.message)) : throwError(() => new Error('DPoP verification failed due to an unknown error'))),
      // gets successful response or errors with body
      switchMap((thumbprint) => zip(of(thumbprint), this.getUpstreamResponse(noDpopRequestContext))),
      // creates dpop response
      switchMap(([ thumbprint, response ]) => this.createDpopResponse(response, thumbprint)),
      // switches any errors with body into responses; all the rest are server errors which will hopefully be caught higher
      catchError((error) => {

        // eslint-disable-next-line no-console
        console.log('DPoP handler error: ', error);

        return error.body && error.headers && error.status ? of(error) : throwError(() => error);

      }),
    );

  }

  private verifyDpopProof(
    method: string, { payload, protectedHeader: header }: JWTVerifyResult,
  ): Observable<JWTVerifyResult & { protectedHeader: { jwk: Pick<JWK, 'kty' | 'crv' | 'x' | 'y' | 'e' | 'n'> } }> {

    const jwk = header.jwk;

    if (!jwk) { return throwError(() => new Error('no JWK was found in the header')); }

    if (!payload.jti || typeof payload.jti !== 'string') { return throwError(() => new Error('must have a jti string property')); }

    if (payload.htm !== method) { return throwError(() => new Error('htm does not match the request method')); }

    if (payload.htu !== this.proxyTokenUrl) { return throwError(() => new Error('htu does not match')); }

    const jti = payload.jti;

    return from(this.keyValueStore.get('jtis')).pipe(
      switchMap((jtis) => {

        if (jtis?.includes(jti)) {

          return throwError(() => new Error('jti must be unique'));

        }

        this.keyValueStore.set('jtis', jtis ? [ ...jtis, jti ] : [ jti ]);

        return of({ payload, protectedHeader: { ... header, jwk } });

      }),
    );

  }

  private dpopError = (error_description: string) => ({
    body: JSON.stringify({
      error: 'invalid_dpop_proof',
      error_description,
    }),
    headers: { },
    status: 400,
  });

  private getUpstreamResponse = (context: HttpHandlerContext) => this.handler.handle(context).pipe(
    switchMap((response) => response.status === 200 ? of(response) : throwError(() => response)),
  );

  private createDpopResponse(response: HttpHandlerResponse, thumbprint: string) {

    // set the cnf claim to contain the thumbprint of the client's jwk
    response.body.access_token.payload.cnf = { 'jkt': thumbprint };
    response.body.token_type = 'DPoP';

    return of({
      body: response.body,
      headers: response.headers,
      status: 200,
    });

  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or the request's method, headers, or url are not included.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean>{

    return context
      && context.request
      && context.request.method
      && context.request.headers
      && context.request.url
      ? of(true)
      : of(false);

  }

}
