import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, from, throwError, zip, Observable } from 'rxjs';
import { switchMap, catchError, tap, map } from 'rxjs/operators';
import { EmbeddedJWK, calculateJwkThumbprint, jwtVerify, JWTVerifyResult, generateKeyPair, exportJWK, SignJWT, base64url } from 'jose';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';

/**
 * A {Handler<HttpHandlerContext, HttpHandlerContext>} that verifies the DPoP-proof, replaces the htm with one pointing to the upstream,
 * and then encodes the DPoP-proof again.
 */
export class DpopPassThroughRequestHandler extends HttpHandler {

  private logger = getLoggerFor(this, 5, 5);

  /**
   * Creates a {DpopPassThroughRequestHandler} passing requests through the given handler.
   *
   * @param {HttpHandler} handler - The handler to which to pass the request.
   * @param {string} proxyTokenUrl - the url of the proxy server's token endpoint.
   * @param {string} upstreamTokenUrl - the url of the upstream server's token endpoint.
   */
  constructor(private handler: HttpHandler, private proxyTokenUrl: string, private upstreamTokenUrl: string) {

    super();

    if (!handler) { throw new Error('A HttpHandler must be provided'); }

    if (!proxyTokenUrl) { throw new Error('A proxyTokenUrl must be provided'); }

    if (!upstreamTokenUrl) { throw new Error('A upstreamTokenUrl must be provided'); }

  }

  /**
   * Handles the context's incoming request. If the DPoP proof is valid it will update the htm claim
   * in the DPoP proof to the upstream's token endpoint and encode the DPoP proof before passing on the request.
   * Returns an error response if the DPoP proof is invalid.
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {

      this.logger.verbose('No context was provided', context);

      return throwError(() => new Error('Context cannot be null or undefined'));

    }

    if (!context.request) {

      this.logger.verbose('No request was provided', context.request);

      return throwError(() => new Error('No request was included in the context'));

    }

    if (!context.request.headers) {

      this.logger.verbose('No request headers were provided', context.request.headers);

      return throwError(() => new Error('No headers were included in the request'));

    }

    if (!context.request.headers.dpop) {

      this.logger.debug('No DPoP proof was provided', context.request.headers.dpop);

      return of({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'DPoP header missing on the request.' }),
        headers: { },
        status: 400,
      });

    }

    const verifyOptions = {
      typ: 'dpop+jwt',
    };

    return from(jwtVerify(context.request.headers.dpop, EmbeddedJWK, verifyOptions)).pipe(
      switchMap((jwt) => this.updateDpopProof(jwt)),
      catchError((error) => throwError(() => this.dpopError(error.message))),
      switchMap((updatedDpopProof) =>
        this.getUpstreamResponse({
          ...context,
          request: {
            ...context.request,
            headers: {
              ...context.request.headers,
              dpop: updatedDpopProof,
            },
          },
        })),
      switchMap((response) => this.updateDpopResponse(response, context.request.headers.dpop)),
      catchError((error) => error.body && error.headers && error.status ? of(error) : throwError(() => error)),
    );

  }

  private updateDpopProof(
    { payload, protectedHeader: header }: JWTVerifyResult
  ): Observable<string> {

    if (payload.htu !== this.proxyTokenUrl) {

      this.logger.debug('DPoP proof does not point to the proxy token endpoint', payload.htu);

      return throwError(() => new Error('htu does not match'));

    }

    return from(generateKeyPair('ES256')).pipe(
      switchMap(({ publicKey, privateKey }) =>  zip(from(exportJWK(publicKey)), of(privateKey))),
      switchMap(([ publicJwk, privateKey ]) => from(
        new SignJWT({ ...payload, htu: this.upstreamTokenUrl })
          .setProtectedHeader({ ...header, jwk: publicJwk })
          .sign(privateKey)
      )),
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

  private updateDpopResponse(response: HttpHandlerResponse, originalDpopProof: string) {

    const originalDpopProofHeader = JSON.parse(base64url.decode(originalDpopProof.split('.')[0]).toString());

    return from(calculateJwkThumbprint(originalDpopProofHeader.jwk)).pipe(
      tap((thumbprint) => response.body.access_token.payload.cnf = { 'jkt': thumbprint }),
      map(() => ({
        body: response.body,
        headers: response.headers,
        status: 200,
      })),
    );

  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or the request's method, headers, or url are not included.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    this.logger.info('Checking canHandle', context);

    return context
      && context.request
      && context.request.headers
      ? of(true)
      : of(false);

  }

}
