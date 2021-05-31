import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { parseQuads, getOidcRegistrationTriple, getWebID } from '../util/process-webid';

/**
 * A {HttpHandler} that
 * - gets the webid data and retrieves oidcRegistration
 * - replaces the client id in the request with a  static client id that was given in to the constructor
 * - registers if not registered or information is updated
 * - stores the registration in the keyvalue store
 */
export class SolidClientStaticAuthRegistrationHandler extends HttpHandler {

  /**
   * Creates a { SolidClientStaticAuthRegistrationHandler }.
   *
   * @param { string } clientID - the registration endpoint for the currently used provider.
   * @param { string} clientSecret - the client secret used to authenticate the user
   * @param { HttpHandler } httpHandler - the handler through which to pass requests
   */
  constructor(
    private clientID: string,
    private clientSecret: string,
    private httpHandler: HttpHandler,
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

  }

  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {

      return throwError(new Error('A context must be provided'));

    }

    if (!context.request) {

      return throwError(new Error('No request was included in the context'));

    }

    const client_id = context.request.url.searchParams.get('client_id');
    const redirect_uri = context.request.url.searchParams.get('redirect_uri');

    if (!client_id) {

      return throwError(new Error('No client_id was provided'));

    }

    try {

      const url = new URL(client_id);

    } catch (error) {

      return throwError(new Error('The provided client_id is not a valid URL'));

    }

    if (!redirect_uri) {

      return throwError(new Error('No redirect_uri was provided'));

    }

    return from(getWebID(client_id))
      .pipe(
        switchMap((response) => (response.headers.get('content-type') !== 'text/turtle')
          ? throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`))
          : from(response.text())),
        map((text) => parseQuads(text)),
        switchMap((quads) => getOidcRegistrationTriple(quads)),
        tap(() => context.request.url.searchParams.set('client_id', this.clientID)),
        tap(() => context.request.url.searchParams.set('client_secret', this.clientSecret)),
        switchMap(() => this.httpHandler.handle(context)),
      );

  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
    && context.request
    && context.request.url
      ? of(true)
      : of(false);

  }

}
