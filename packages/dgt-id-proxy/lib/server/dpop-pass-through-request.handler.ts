import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, from, throwError, zip, Observable } from 'rxjs';
import { switchMap, catchError, tap, map } from 'rxjs/operators';
import { EmbeddedJWK } from 'jose/jwk/embedded';
import { calculateThumbprint } from 'jose/jwk/thumbprint';
import { jwtVerify } from 'jose/jwt/verify';
import { JWTVerifyResult } from 'jose/types';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { fromKeyLike } from 'jose/jwk/from_key_like';
import { SignJWT } from 'jose/jwt/sign';
import { decode } from 'jose/util/base64url';

/**
 * A { Handler<HttpHandlerContext, HttpHandlerContext> } that verifies the DPoP-proof, replaces the htm with one pointing to the upstream,
 * and then encodes the DPoP-proof again.
 */
export class DpopPassThroughRequestHandler extends HttpHandler {

  /**
   * Creates a { DpopPassThroughRequestHandler } passing requests through the given handler.
   *
   * @param { HttpHandler } handler - The handler to which to pass the request.
   * @param { string } proxyTokenUrl - The url of the proxy server's token endpoint.
   * @param { string } upstreamTokenUrl - The url of the upstream server's token endpoint.
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
   * @param {HttpHandlerContext} context - The context of the incoming request.
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) { return throwError(() => new Error('Context cannot be null or undefined')); }

    if (!context.request) { return throwError(() => new Error('No request was included in the context')); }

    if (!context.request.headers) { return throwError(() => new Error('No headers were included in the request')); }

    if (!context.request.headers.dpop) {

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

  /**
   * Replaces the HTU claim in the DPoP proof to match the upstream token endpoint.
   *
   * @param { JWTVerifyResult } { payload, protectedHeader: header } - The JWT to be updated.
   * @returns a signed JWT with the expected HTU claim of the upstream.
   */
  private updateDpopProof(
    { payload, protectedHeader: header }: JWTVerifyResult
  ): Observable<string> {

    if (payload.htu !== this.proxyTokenUrl) {

      return throwError(() => new Error('htu does not match'));

    }

    return from(generateKeyPair('ES256')).pipe(
      switchMap(({ publicKey, privateKey }) =>  zip(from(fromKeyLike(publicKey)), of(privateKey))),
      switchMap(([ publicJwk, privateKey ]) => from(
        new SignJWT({ ...payload, htu: this.upstreamTokenUrl })
          .setProtectedHeader({ ...header, jwk: publicJwk })
          .sign(privateKey)
      )),
    );

  }

  /** Creates an error response specifically for DPoP related errors
   *
   * @param { string } error_description - The error description to include in the response body.
   * @returns The error response.
   */
  private dpopError = (error_description: string): HttpHandlerResponse => ({
    body: JSON.stringify({
      error: 'invalid_dpop_proof',
      error_description,
    }),
    headers: { },
    status: 400,
  });

  /**
   * Returns an observable of the upstream response if it's a successful one or throws it as an error.
   *
   * @param { HttpHandlerContext } context - The context of the request to handle.
   * @returns Observable<HttpHandlerResponse> | Observable<never> - Observable of a response object if successful or of an error.
   */
  private getUpstreamResponse = (context: HttpHandlerContext) => this.handler.handle(context).pipe(
    switchMap((response) => response.status === 200 ? of(response) : throwError(() => response)),
  );

  /**
   * Updates the DPoP response so that it contains the thumbprint of the upstream and not the proxy.
   *
   * @param { HttpHandlerResponse } response - The original response to be modified before return.
   * @param { string } originalDpopProof - The original DPoP proof containing the proxy's thumbprint of the .
   * @returns Containing the updated DPoP proof with a new thumbprint.
   */
  private updateDpopResponse(
    response: HttpHandlerResponse,
    originalDpopProof: string
  ): Observable<HttpHandlerResponse> {

    const originalDpopProofHeader = JSON.parse(decode(originalDpopProof.split('.')[0]).toString());

    return from(calculateThumbprint(originalDpopProofHeader.jwk)).pipe(
      tap((thumbprint) => response.body.access_token.payload.cnf = { 'jkt': thumbprint }),
      map(() => ({
        body: response.body,
        headers: response.headers,
        status: 200,
      })),
    );

  }

  /**
   * Confirms if the handler can handle the request by checking if the request headers are present.
   *
   * @param {HttpHandlerContext} context - The context of the incoming request.
   * @returns Boolean stating if the context can be handled or not.
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
      && context.request
      && context.request.headers
      ? of(true)
      : of(false);

  }

}

