import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, cleanHeaders } from '@digita-ai/handlersjs-http';
import { of, throwError, Observable } from 'rxjs';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { v4 as uuidv4 } from 'uuid';
import { createErrorResponse } from '../util/error-response-factory';

/**
 * A { HttpHandler } that handles requests made to the /passwordless/start endpoint of
 * an Auth0 upstream server using the Auth0 classic login.
 */
export class Auth0PasswordlessApiHandler extends HttpHandler {

  /**
   * Creates an { Auth0PasswordlessApiHandler }.
   *
   * @param {KeyValueStore<string, string>} clientSentStateStore - store with the client's state mapped to a boolean stating if the client sent the state or not
   * @param {KeyValueStore<string, string>} clientStateToClientRedirectUriStore - store with the client's state mapped to the client's redirect_uri\
   * @param {string} upstreamUrl - the URL of the upstream server
   * @param {proxyRedirectUri} - the redirect URI of the proxy
   * @param {HttpHandler} handler - handler that will handle the context and return a response
   */
  constructor(
    private clientSentStateStore: KeyValueStore<string, boolean>,
    private clientStateToClientRedirectUriStore: KeyValueStore<string, string>,
    private upstreamUrl: string,
    private proxyRedirectUri: string,
    private handler: HttpHandler
  ) {

    super();

    if(!clientSentStateStore){

      throw new Error('A clientSentStateStore must be provided');

    }

    if(!clientStateToClientRedirectUriStore){

      throw new Error('A clientStateToClientRedirectUriStore must be provided');

    }

    if(!upstreamUrl){

      throw new Error('A upstreamUrl must be provided');

    }

    if(!proxyRedirectUri){

      throw new Error('A proxyRedirectUri must be provided');

    }

    if(!handler){

      throw new Error('A handler must be provided');

    }

  }

  /**
   * Handles the Auth0 passwordless api request. Checks that a redirect_uri was provided.
   * Also checks that a state was provided, and if it wasn't generates a state and adds
   * a value to the store indicating if the specified state was sent by the client or not
   * so that it can later be removed by the AuthStateResponseHandler. It then saves the state
   * and the client's redirect_uri so that the requested code can eventually be returned to the client.
   * Finally, the redirect_uri of the proxy replaces the client's redirect_uri in the request body,
   * and, if a state was generated, it is added to the request body as well, along with the audience
   * parameter required by the Auth0 upstream to return JWT access tokens.
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {

      return throwError(() => new Error('Context cannot be null or undefined'));

    }

    if (!context.request) {

      return throwError(() => new Error('No request was included in the context'));

    }

    if (!context.request.headers) {

      return throwError(() => new Error('No headers were included in the request'));

    }

    const headers = cleanHeaders(context.request.headers);

    if(headers['content-type'] !== 'application/json') {

      return of(createErrorResponse('invalid request', 'the request must include a "content-type" header containing "application/json"'));

    }

    if (!context.request.body) {

      return throwError(() => new Error('No body was included in the request'));

    }

    const body = context.request.body;

    if (!body.authParams || !body.authParams.redirect_uri) {

      return of(createErrorResponse('invalid request', 'the request must include a "authParams" parameter with a "redirect_uri" parameter'));

    }

    const state = body.authParams.state;

    const generatedState = state ? '' : uuidv4();

    this.clientSentStateStore.set(state ?? generatedState, !!state);
    this.clientStateToClientRedirectUriStore.set(state ?? generatedState, body.authParams.redirect_uri);

    const audience = new URL('/api/v2/', this.upstreamUrl).toString();

    return this.handler.handle({
      ...context,
      request: {
        ...context.request,
        body: {
          ...context.request.body,
          authParams: {
            ...context.request.body.authParams,
            audience,
            redirect_uri: this.proxyRedirectUri,
            state: state ?? generatedState,
          },
        },
      },
    });

  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or the request's headers, or body are not included.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
      && context.request
      && context.request.headers
      && context.request.body
      ? of(true)
      : of(false);

  }

}
