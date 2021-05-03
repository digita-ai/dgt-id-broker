import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { of, from, throwError, zip, Observable } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { EmbeddedJWK } from 'jose/jwk/embedded';
import { calculateThumbprint } from 'jose/jwk/thumbprint';
import { jwtVerify } from 'jose/jwt/verify';
import { JWK, JWTVerifyResult } from 'jose/webcrypto/types';
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
   * @param {string} pathToJwks - the path to a json file containing jwks.
   * @param {string} proxyUrl - the url of the upstream server.
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
   * Handles the context's incoming request. If the request is a valid DPoP request it will send a DPoP-less request
   * to the upstream server and modify the Access Token to be a valid DPoP bound Access Token.
   * Otherwise it will return error responses as specified by the DPoP proof spec otherwise.
   *
   * @param {HttpHandlerContext} context
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
      // creates dpop response
      switchMap(([ thumbprint, response ]) => this.createDpopResponse(response, thumbprint)),
      // switches any errors with body into responses; all the rest are server errors which will hopefully be caught higher
      catchError((error) => error.body && error.headers && error.status ? of(error) : throwError(error)),
    );

  }

  private verifyDpopProof(
    method: string, { payload, protectedHeader: header }: JWTVerifyResult,
  ): Observable<JWTVerifyResult & { protectedHeader: { jwk: Pick<JWK, 'kty' | 'crv' | 'x' | 'y' | 'e' | 'n'> } }> {

    const jwk = header.jwk;

    if (!jwk) {
      return throwError(new Error('header must contain a jwk'));
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

  private createDpopResponse(response: HttpHandlerResponse, thumbprint: string) {
    // set the cnf claim to contain the thumbprint of the client's jwk
    response.body.access_token.payload.cnf = { 'jkt': thumbprint };
    response.body.token_type = 'DPoP';

    return of({
      body: response.body,
      headers: {},
      status: 200,
    });
  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or the request's method, headers, or url are not included.
   *
   * @param {HttpHandlerContext} context
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
