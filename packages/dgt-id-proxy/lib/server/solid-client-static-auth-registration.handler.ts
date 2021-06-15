import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { parseQuads, getOidcRegistrationTriple, getWebID } from '../util/process-webid';

/**
 * A {HttpHandler} that gets the webid data and retrieves oidcRegistration. If the info is
 * valid, it replaces the client id and redirect uri in the request with those that were given
 * in the constructor, and saves the redirect uri that the client sent in the keyValueStore
 * with the state as key so that it can be replaced later when the redirect response is
 * sent by teh upstream.
 */
export class SolidClientStaticAuthRegistrationHandler extends HttpHandler {

  private redirectURL: URL;

  /**
   * Creates a { SolidClientStaticAuthRegistrationHandler }.
   *
   * @param { HttpHandler } httpHandler - the handler through which to pass requests.
   * @param { string } clientID - the client_id of the static client configured on the upstream server.
   * @param { string } clientSecret - the client secret used to the static client configured on the upstream server.
   * @param { string } redirectUri - the redirectUri of the static client on the upstream server.
   * @param { KeyValueStore<string, URL> } keyValueStore - the keyValueStore in which to save client sent redirect uris
   */
  constructor(
    private httpHandler: HttpHandler,
    private clientID: string,
    private clientSecret: string,
    private redirectUri: string,
    private keyValueStore: KeyValueStore<string, URL>
  ) {

    super();

    if (!clientID) {

      throw new Error('No clientID was provided');

    }

    if (!clientSecret) {

      throw new Error('No clientSecret was provided');

    }

    if (!httpHandler) {

      throw new Error('No handler was provided');

    }

    if (!redirectUri) {

      throw new Error('No redirectUri was provided');

    }

    try {

      this.redirectURL = new URL(redirectUri);

    } catch (e) {

      throw new Error('redirectUri must be a valid URI');

    }

    if (!keyValueStore) {

      throw new Error('No keyValueStore was provided');

    }

  }

  /**
   * Handles the context. Checks that the request contains a client id and redirect uri.
   * It retrieves the information from the webid of the given client id.
   * Checks if the response is of the expected turtle type.
   * Parses the turtle response into Quads and retrieves the required oidcRegistration triple
   * It replaces the client id and redirect uri in the context with the one given to the constructor,
   * and adds the client secret.
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {

      return throwError(new Error('A context must be provided'));

    }

    if (!context.request) {

      return throwError(new Error('No request was included in the context'));

    }

    const client_id = context.request.url.searchParams.get('client_id');
    const redirect_uri = context.request.url.searchParams.get('redirect_uri');
    const state = context.request.url.searchParams.get('state');

    if (!client_id) {

      return throwError(new Error('No client_id was provided'));

    }

    if (!redirect_uri) {

      return throwError(new Error('No redirect_uri was provided'));

    }

    try {

      new URL(redirect_uri);

    } catch(error) {

      return throwError(new Error('redirect_uri must be a valid URL'));

    }

    try {

      new URL(client_id);

    } catch (error) {

      return this.httpHandler.handle(context);

    }

    if (!state) {

      return throwError(new Error('Request must contain a state. Add state handlers to the proxy.'));

    }

    this.keyValueStore.set(state, new URL(redirect_uri));

    return from(getWebID(client_id))
      .pipe(
        switchMap((response) => (response.headers.get('content-type') !== 'text/turtle')
          ? throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`))
          : from(response.text())),
        map((text) => parseQuads(text)),
        switchMap((quads) => getOidcRegistrationTriple(quads)),
        tap(() => context.request.url.searchParams.set('client_id', this.clientID)),
        tap(() => context.request.url.searchParams.set('client_secret', this.clientSecret)),
        tap(() => context.request.url.searchParams.set('redirect_uri', this.redirectUri)),
        switchMap(() => this.httpHandler.handle(context)),
      );

  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or request url are not included.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
    && context.request
    && context.request.url
      ? of(true)
      : of(false);

  }

}
