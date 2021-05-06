import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError, zip } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { verifyUpstreamJwk } from '../util/verify-upstream-jwk';

/**
 * A {HttpHandler} that handles Access Token responses for an upstream server that returns Opaque Access Tokens
 * by turning them into valid JSON Web Tokens
 */
export class OpaqueAccessTokenHandler extends HttpHandler {
  /**
   * Creates an {OpaqueAccessTokenHandler} which passes requests it receives through the given handler,
   * and uses the upstream url to verify the id token it receives.
   *
   * @param {HttpHandler} handler - the handler to pass requests to
   * @param {string} upstreamUrl - url of the upstream server
   */
  constructor(private handler: HttpHandler, private upstreamUrl: string){
    super();

    if (!handler) {
      throw Error('handler must be defined');
    }

    if (!upstreamUrl) {
      throw new Error('upstreamUrl must be defined');
    }
  }

  /**
   * Handles the context by saving the client_id passed in it and then getting the response from it's handler.
   * The sub, aud, iat and exp claims from the id_token returned by the upstream server, along with the client_id,
   * are used to create a valid JWT Access Token.
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

    if (!context.request.body) {
      return throwError(new Error('No body was included in the request'));
    }

    const client_id = new URLSearchParams(context.request.body).get('client_id');
    if (!client_id) {
      return throwError(new Error('Request body must contain a client_id claim'));
    }

    return this.getUpstreamResponse(context).pipe(
      switchMap((response) => zip(of(response), this.createJwtAccessToken(response.body, client_id))),
      map(([ response, token ]) => this.createAccessTokenResponse(response, token)),
      catchError((error) => error.body && error.headers && error.status ? of(error) : throwError(error)),
    );
  }

  private getUpstreamResponse = (context: HttpHandlerContext) => this.handler.handle(context).pipe(
    switchMap((response) => response.status === 200 ? of(response) : throwError(response)),
  );

  private createJwtAccessToken(responseBody: string, client_id: string): Observable<{ header: any; payload: any }> {
    const parsedBody = JSON.parse(responseBody);

    // verify that the id_token was sent and signed by the upstream server, then use claims from the payload we get back to create
    // an access token
    return verifyUpstreamJwk(parsedBody.id_token, this.upstreamUrl).pipe(
      map(({ payload }) => ({
        header: {},
        payload: {
          sub: payload.sub,
          aud: payload.aud,
          iat: payload.iat,
          exp: payload.exp,
          client_id,
        },
      })),
    );
  }

  private createAccessTokenResponse(
    response: HttpHandlerResponse,
    jwtAccessToken: { header: any; payload: any },
  ) {
    const parsedBody = JSON.parse(response.body);
    parsedBody.access_token = jwtAccessToken;
    return {
      body: parsedBody,
      headers: {},
      status: 200,
    };
  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or the request's method, headers, url or body are not included.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext) {
    return context
        && context.request
        && context.request.method
        && context.request.headers
        && context.request.url
        && context.request.body
      ? of(true)
      : of(false);
  }
}

