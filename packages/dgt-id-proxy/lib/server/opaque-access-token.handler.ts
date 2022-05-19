import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError, zip } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';

/**
 * A { HttpHandler } that handles Access Token responses for an upstream server that returns Opaque Access Tokens
 * by turning them into valid JSON Web Tokens
 */
export class OpaqueAccessTokenHandler extends HttpHandler {

  private logger = getLoggerFor(this, 1, 1);

  /**
   * Creates an { OpaqueAccessTokenHandler } which passes requests it receives through the given handler,
   * and uses the upstream url to verify the id token it receives.
   *
   * @param { HttpHandler } handler - The handler to pass requests to.
   */
  constructor(private handler: HttpHandler){

    super();

    if (!handler) {

      throw Error('handler must be defined');

    }

  }

  /**
   * Handles the context request by retrieving the client_id passed in it and then getting the response from it's handler.
   * The sub, aud, iat and exp claims from the id_token returned by the upstream server, along with the client_id,
   * are used to create a valid JWT Access Token.
   *
   * @param { HttpHandlerContext } context - The context containing the request.
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {

      this.logger.verbose('No context provided', context);

      return throwError(() => new Error('Context cannot be null or undefined'));

    }

    if (!context.request) {

      this.logger.verbose('No request provided', context);

      return throwError(() => new Error('No request was included in the context'));

    }

    if (!context.request.method) {

      this.logger.verbose('No request method provided', context.request);

      return throwError(() => new Error('No method was included in the request'));

    }

    if (!context.request.headers) {

      this.logger.verbose('No request headers provided', context.request);

      return throwError(() => new Error('No headers were included in the request'));

    }

    if (!context.request.url) {

      this.logger.verbose('No request url provided', context.request);

      return throwError(() => new Error('No url was included in the request'));

    }

    if (!context.request.body) {

      this.logger.verbose('No request body provided', context.request);

      return throwError(() => new Error('No body was included in the request'));

    }

    let client_id = new URLSearchParams(context.request.body).get('client_id') ?? '';

    if (!client_id) {

      const authorizationHeader = context.request.headers['Authorization'];

      if (!authorizationHeader) return throwError(() => new Error('Request must contain a client_id claim'));

      if (authorizationHeader.startsWith('Basic ')) {

        const authorizationHash = authorizationHeader.split(' ')[1];
        const decodedAuthHeader = Buffer.from(authorizationHash, 'base64').toString('binary');

        if (decodedAuthHeader.split(':').length > 1) {

          client_id = decodedAuthHeader.substring(0, decodedAuthHeader.lastIndexOf(':'));

        } else {

          return throwError(() => new Error('Request must contain a client_id claim'));

        }

      } else {

        return throwError(() => new Error('Request must contain a client_id claim'));

      }

    }

    return this.getUpstreamResponse(context).pipe(
      switchMap((response) => zip(of(response), this.createJwtAccessToken(response.body, client_id))),
      map(([ response, token ]) => this.createAccessTokenResponse(response, token)),
      catchError((error) => error.body && error.headers && error.status ? of(error) : throwError(() => error)),
    );

  }
  /**
   * Gets the response from the upstream server and errors if it is not a success status code.
   *
   * @param { HttpHandlerContext } context - The context containing the request.
   * @returns The upstream response to the request made.
   */
  private getUpstreamResponse = (context: HttpHandlerContext): Observable<HttpHandlerResponse> =>
    this.handler.handle(context).pipe(
      switchMap((response) => response.status === 200 ? of(response) : throwError(() => response)),
    );

  /**
   * Creates a JWT Access Token from the id token returned by the upstream server.
   *
   * @param { any } responseBody - The response body containing the id token.
   * @param { string } client_id - The client id to be included in the token.
   * @returns The JWT access token containing all necessary claims and the client id.
   */
  private createJwtAccessToken(responseBody: any, client_id: string): Observable<{ header: any; payload: any }> {

    if (!responseBody.id_token) {

      this.logger.verbose('Response body did not contain an id token', responseBody);

      return throwError(() => new Error('response body must be JSON and must contain an id_token'));

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

  /**
   * Creates a response by setting the access token in the response body to the one provided.
   *
   * @param { HttpHandlerResponse } response - The original response containing the body and headers that will be passed together with the JWT access token.
   * @param { { header: any; payload: any } } accessToken - The access token that will be included in the response body.
   * @returns A response object containing the newly provided accessToken and the original response headers and body.
   */
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
   * Specifies that if the response is defined this handler can handle the response by checking if it contains the necessary information.
   *
   * @param { HttpHandlerResponse } response - The response to handle.
   * @returns Boolean stating if the handler can handle the response.
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    this.logger.info('Checking canHandle', context);

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

