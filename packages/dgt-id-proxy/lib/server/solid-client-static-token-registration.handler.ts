import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { recalculateContentLength } from '../util/recalculate-content-length';
import { parseQuads, getOidcRegistrationTriple, getWebID } from '../util/process-webid';

/**
 * A {HttpHandler} that
 * - gets the webid data and retrieves oidcRegistration
 * - checks the if it's a valid webid and compares the grant types
 * - replaces the client id in the client secret in the context
 */
export class SolidClientStaticTokenRegistrationHandler extends HttpHandler {

  /**
   * Creates a { SolidClientStaticTokenRegistrationHandler }.
   *
   * @param { string } clientID - the registration endpoint for the currently used provider.
   * @param { string} clientSecret - the client secret used to authenticate the user
   * @param { HttpHandler } httpHandler - the handler through which to pass requests
   */
  constructor(
    private httpHandler: HttpHandler,
    private clientID: string,
    private clientSecret: string,
  ){

    super();

    if (!httpHandler) {

      throw new Error('No handler was provided');

    }

    if (!clientID) {

      throw new Error('No clientID was provided');

    }

    if (!clientSecret) {

      throw new Error('No clientSecret was provided');

    }

  }

  /**
   * Handles the context. Checks that the request contains a client id, grant type and redirect uri.
   * It retrieves the information from the webid of the given client id.
   * Checks if the response is of the expected turtle type.
   * Parses the turtle response into Quads and retrieves the required oidcRegistration triple
   * so it knows if it's a valid webid.
   * It replaces the client id and client secret in the context with the one given to the constructor.
   * and recalculates the content length because the body has changed
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

    if (!context.request.body) {

      return throwError(new Error('No body was included in the request'));

    }

    const params  = new URLSearchParams(context.request.body);
    const client_id = params.get('client_id');
    const grant_type = params.get('grant_type');
    const redirect_uri = params.get('redirect_uri');

    if (!client_id) {

      return throwError(new Error('No client_id was provided'));

    }

    if (!grant_type) {

      return throwError(new Error('No grant_type was provided'));

    }

    if (!redirect_uri) {

      return throwError(new Error('No redirect_uri was provided'));

    }

    try {

      new URL(client_id);

    } catch (error) {

      return this.httpHandler.handle(context);

    }

    return from(getWebID(client_id))
      .pipe(
        switchMap((response) => (response.headers.get('content-type') !== 'text/turtle')
          ? throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`))
          : from(response.text())),
        map((text) => parseQuads(text)),
        switchMap((quads) => getOidcRegistrationTriple(quads)),
        switchMap((text) => (text.grant_types.includes(grant_type))
          ? of(text)
          : throwError(new Error('The grant type in the request is not included in the WebId'))),
        map(() => {

          params.set('client_id', this.clientID);
          params.set('client_secret', this.clientSecret);

          return { ...context, request: { ...context.request, body: params.toString() } };

        }),
        switchMap((newContext) => zip(of(newContext), of(recalculateContentLength(newContext.request)))),
        tap(([ newContext, length ]) => newContext.request.headers['content-length'] = length),
        switchMap(([ newContext ]) => this.httpHandler.handle(newContext)),
      );

  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or request body are not included.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
    && context.request
    && context.request.body
      ? of(true)
      : of(false);

  }

}
