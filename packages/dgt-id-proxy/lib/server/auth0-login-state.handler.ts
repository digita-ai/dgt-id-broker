import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, throwError, Observable, switchMap, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';

/**
 * A { HttpHandler } that handles requests made to the authorization endpoint of
 * an Auth0 upstream server using the Auth0 classic login.
 */
export class Auth0LoginStateHandler extends HttpHandler {

  /**
   * Creates an { Auth0LoginStateHandler }.
   *
   * @param {KeyValueStore<string, string>} clientStateToClientRedirectUriStore - store with the client's state mapped to the client's redirect uri
   * @param {KeyValueStore<string, string>} upstreamStateToClientStateStore - store with the upstream's state mapped to the client's state
   * @param {HttpHandler} handler - handler that will handle the context and return a response
   */
  constructor(
    private clientStateToClientRedirectUriStore: KeyValueStore<string, string>,
    private upstreamStateToClientStateStore: KeyValueStore<string, string>,
    private handler: HttpHandler
  ) {

    super();

    if(!clientStateToClientRedirectUriStore){

      throw new Error('A clientStateToClientRedirectUriStore must be provided');

    }

    if(!upstreamStateToClientStateStore){

      throw new Error('A upstreamStateToClientStateStore must be provided');

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

    if (!context.request.headers) {

      return throwError(() => new Error('No headers were included in the request'));

    }

    if (!context.request.url) {

      return throwError(() => new Error('No url was included in the request'));

    }

    const state = context.request.url.searchParams.get('state');

    if (!state) {

      return throwError(() => new Error('No state was included in the request'));

    }

    const redirectUri = context.request.url.searchParams.get('redirect_uri');

    if (!redirectUri) {

      return throwError(() => new Error('No redirect_uri was included in the request'));

    }

    this.clientStateToClientRedirectUriStore.set(state, decodeURIComponent(redirectUri));

    return this.handler.handle(context).pipe(
      switchMap((response: HttpHandlerResponse) => {

        const upstreamState = new URL(response.headers.location, 'https://example.com').searchParams.get('state');

        if (!upstreamState) {

          return throwError(() => new Error('No upstreamState was included in the response'));

        }

        this.upstreamStateToClientStateStore.set(upstreamState, state);

        return of(response);

      })
    );

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
