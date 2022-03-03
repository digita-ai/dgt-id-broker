import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, throwError, Observable, switchMap } from 'rxjs';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { v4 as uuidv4 } from 'uuid';
import { createErrorResponse } from '../util/error-response-factory';

/**
 * A { HttpHandler } that handles requests made to the authorization endpoint of
 * an Auth0 upstream server using the Auth0 classic login.
 */
export class Auth0PasswordlessApiHandler extends HttpHandler {

  /**
   * Creates an { Auth0PasswordlessApiHandler }.
   *
   * @param {KeyValueStore<string, string>} clientStateToClientRedirectUriStore - store with the client's state mapped to the client's redirect uri
   * @param {KeyValueStore<string, string>} upstreamStateToClientStateStore - store with the upstream's state mapped to the client's state
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

    if(!upstreamUrl){

      throw new Error('A upstreamUrl must be provided');

    }

    if(!handler){

      throw new Error('A handler must be provided');

    }

  }

  /**
   * Handles the OIDC authorization request by storing the client sent state and their redirect uri in a KeyValueStore,
   * then sending the response on to another handler. Once a response is received,
   * it will take the state Auth0 added to the url in the location header and store it with the client's state and then return the response.
   *
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

    if (!context.request.body) {

      return throwError(() => new Error('No body was included in the request'));

    }

    const body = context.request.body;

    if (!body.authParams || !body.authParams.redirect_uri) {

      return of(createErrorResponse('invalid request', 'the request must include a "authParams" parameter with a "redirect_uri" parameter'));

    }

    const state = body.authParams.state;

    const generatedState = state ? '' : uuidv4();

    if (generatedState) {

      context.request.url.searchParams.append('state', generatedState);

    }

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
   * Returns false if the context, it's request, or the request's method, headers, or url are not included.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
      && context.request
      && context.request.headers
      && context.request.url
      ? of(true)
      : of(false);

  }

}
