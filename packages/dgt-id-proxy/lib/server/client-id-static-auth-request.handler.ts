import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { retrieveAndValidateClientRegistrationData } from '../util/process-client-registration-data';

/**
 * A {Handler<HttpHandlerContext, HttpHandlerContext>} that gets the registration data and retrieves oidcRegistration. If the info is
 * valid, it replaces the client id and redirect uri in the request with those that were given
 * in the constructor, and saves the redirect uri that the client sent in the keyValueStore
 * with the state as key so that it can be replaced later when the redirect response is
 * sent by the upstream.
 */
export class ClientIdStaticAuthRequestHandler extends Handler<HttpHandlerContext, HttpHandlerContext> {

  private redirectURL: URL;

  /**
   * Creates a { ClientIdStaticAuthRequestHandler }.
   *
   * @param { string } clientId - the client_id of the static client configured on the upstream server.
   * @param { string } redirectUri - the redirectUri of the static client on the upstream server.
   * @param { KeyValueStore<string, URL> } keyValueStore - the keyValueStore in which to save client sent redirect uris
   */
  constructor(
    private clientId: string,
    private redirectUri: string,
    private keyValueStore: KeyValueStore<string, URL>
  ) {

    super();

    if (!clientId) { throw new Error('No clientId was provided'); }

    if (!redirectUri) { throw new Error('No redirectUri was provided'); }

    try {

      this.redirectURL = new URL(redirectUri);

    } catch (e) {

      throw new Error('redirectUri must be a valid URI');

    }

    if (!keyValueStore) { throw new Error('No keyValueStore was provided'); }

  }

  /**
   * Handles the context. Checks that the request contains a client id and redirect uri.
   * It retrieves the information from the registration data of the given client id.
   * Checks if the response is of the expected turtle type.
   * Parses the turtle response into Quads and retrieves the required oidcRegistration triple
   * It replaces the client id and redirect uri in the context with the one given to the constructor,
   * and adds the client secret.
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerContext> {

    if (!context) { return throwError(new Error('A context must be provided')); }

    if (!context.request) { return throwError(new Error('No request was included in the context')); }

    if (!context.request.url) { return throwError(new Error('No url was included in the request')); }

    const client_id = context.request.url.searchParams.get('client_id');
    const redirect_uri = context.request.url.searchParams.get('redirect_uri');
    const state = context.request.url.searchParams.get('state');

    if (!client_id) { return throwError(new Error('No client_id was provided')); }

    if (!redirect_uri) { return throwError(new Error('No redirect_uri was provided')); }

    try {

      new URL(redirect_uri);

    } catch(error) {

      return throwError(new Error('redirect_uri must be a valid URL'));

    }

    if (!state) { return throwError(new Error('Request must contain a state. Add state handlers to the proxy.')); }

    this.keyValueStore.set(state, new URL(redirect_uri));

    try {

      new URL(client_id);

    } catch (error) {

      return of(context);

    }

    return of(client_id).pipe(
      switchMap((clientId) => clientId === 'http://www.w3.org/ns/solid/terms#PublicOidcClient' ? of({}) : retrieveAndValidateClientRegistrationData(clientId, context.request.url.searchParams)),
      tap(() => context.request.url.searchParams.set('client_id', this.clientId)),
      tap(() => context.request.url.searchParams.set('redirect_uri', this.redirectUri)),
      mapTo(context),
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
