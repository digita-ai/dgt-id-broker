import { runInThisContext } from 'vm';
import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, throwError, Observable, switchMap, zip, from } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';

/**
 * A { HttpHandler } that handles requests to the proxy's redirect endpoint. To be used when proxying
 * an Auth0 upstream server using the Auth0 classic login.
 */
export class Auth0ClientRedirectHandler extends HttpHandler {

  /**
   * Creates an { Auth0ClientRedirectHandler }
   *
   * @param {KeyValueStore<string, string>} clientStateToClientRedirectUriStore - store with the client's state mapped to the client's redirect uri
   * @param {KeyValueStore<string, string>} upstreamStateToClientStateStore - store with the upstream's state mapped to the client's state
   */
  constructor(
    private clientStateToClientRedirectUriStore: KeyValueStore<string, string>,
    private upstreamStateToClientStateStore: KeyValueStore<string, string>,
  ) {

    super();

    if(!clientStateToClientRedirectUriStore){

      throw new Error('A clientStateToClientRedirectUriStore must be provided');

    }

    if(!upstreamStateToClientStateStore){

      throw new Error('A upstreamStateToClientStateStore must be provided');

    }

  }

  /**
   * Handles the request by taking the state and the code from the url in the request,
   * then retreiving the client's state from the clientStateToClientRedirectUriStore using the
   * upstream's state in the url, and then using the client's state to retreive the client's original
   * redirect uri from the upstreamStateToClientStateStore and returning a redirect response to the
   * client's redirect uri with the client's original state and the code from the upstream server.
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

    const upstreamState = context.request.url.searchParams.get('state');

    if (!upstreamState) {

      return throwError(() => new Error('No state was included in the request'));

    }

    const code = context.request.url.searchParams.get('code');

    if (!code) {

      return throwError(() => new Error('No code was included in the request'));

    }

    return from(this.upstreamStateToClientStateStore.get(upstreamState)).pipe(
      switchMap((clientState) => {

        if (!clientState) {

          return throwError(() => new Error('No clientState was found in the upstreamStateToClientStateStore for the given upstreamState'));

        }

        return zip(of(clientState), from(this.clientStateToClientRedirectUriStore.get(clientState)));

      }),
      switchMap(([ clientState, clientRedirectUri ]) => {

        if (!clientRedirectUri) {

          return throwError(() => new Error('No clientRedirectUri was found in the clientStateToClientRedirectUriStore for the given clientState'));

        }

        return of({
          headers: { location: clientRedirectUri + '?state=' + clientState + '&code=' + code },
          status: 302,
        });

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
