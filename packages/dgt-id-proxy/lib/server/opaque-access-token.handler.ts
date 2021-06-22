import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';

import { Observable, of, throwError, zip } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

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
   */
  constructor(private handler: HttpHandler){

    super();

    if (!handler) {

      throw Error('handler must be defined');

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

  private createJwtAccessToken(responseBody: any, client_id: string): Observable<{ header: any; payload: any }> {

    if (!responseBody.id_token) {

      return throwError(new Error('response body must be JSON and must contain an id_token'));

    }

    // get the sub, aud, iat and exp claims from the id token and create an access token with those claims as payload.
    // the encoder will add other necessary claims such as iss and typ
    const accessToken = {
      header: {},
      payload: {
        sub: responseBody.id_token.payload.sub,
        aud: responseBody.id_token.payload.aud,
        iat: responseBody.id_token.payload.iat,
        exp: responseBody.id_token.payload.exp,
        client_id,
      },
    };

    return of(accessToken);

  }

  private createAccessTokenResponse(
    response: HttpHandlerResponse,
    accessToken: { header: any; payload: any },
  ) {

    response.body.access_token = accessToken;

    return {
      body: response.body,
      headers: response.headers,
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

