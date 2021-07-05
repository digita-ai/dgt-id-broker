import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { RegistrationStore } from '../util/process-client-registration-data';
import { recalculateContentLength } from '../util/recalculate-content-length';

/**
 * A {HttpHandler} that
 * - gets the registered data from the store and if not errors
 * - replaces the client id in the body with the registered random client id in the store
 * - recalculates the content length because the body has changed
 * - handles the request
 */
export class ClientIdDynamicTokenHandler extends HttpHandler {

  /**
   * Creates a { ClientIdDynamicTokenHandler }.
   *
   * @param { KeyValueStore } store - the store used to retrieve a clients register data.
   * @param {HttpHandler} httpHandler - the handler through which to pass requests
   */
  constructor(
    private store: RegistrationStore,
    private httpHandler: HttpHandler
  ) {

    super();

    if (!store) { throw new Error('A store must be provided'); }

    if (!httpHandler) { throw new Error('A HttpHandler must be provided'); }

  }

  /**
   * Handles the context. Checks that the request contains a body with a client id.
   * If it does it get the register store data of that given client id from the store.
   * It replaces the given client id in the body with the random registered client id in the store.
   * It recalculates the content-length because the body has changed
   * handles the request and catches the response, if the response is successful and
   * contains a access token the it's client id in the payload is switched again the to original given client id
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) { return throwError(new Error('A context must be provided')); }

    if (!context.request) { return throwError(new Error('No request was included in the context')); }

    if (!context.request.body) { return throwError(new Error('No body was included in the request')); }

    const params  = new URLSearchParams(context.request.body);
    const client_id = params.get('client_id');
    const redirect_uri = params.get('redirect_uri');

    if (!client_id) { return throwError(new Error('No client_id was provided')); }

    if (!redirect_uri) { return throwError(new Error('No redirect_uri was provided')); }

    try {

      new URL(client_id);

    } catch (error) {

      return this.httpHandler.handle(context);

    }

    return from(this.store.get(client_id === 'http://www.w3.org/ns/solid/terms#PublicOidcClient' ? redirect_uri : client_id)).pipe(

      switchMap((registerInfo) => registerInfo
        ? of(registerInfo)
        : throwError(new Error('No data was found in the store'))),
      map((registerInfo) => {

        params.set('client_id', registerInfo.client_id);

        return { ...context, request: { ...context.request, body: params.toString() } };

      }),
      switchMap((newContext) => zip(of(newContext), of(recalculateContentLength(newContext.request)))),
      tap(([ newContext, length ]) => newContext.request.headers['content-length'] = length),
      switchMap(([ newContext ]) => this.httpHandler.handle(newContext)),
      switchMap((response) => {

        if (!response.body.access_token) { return throwError(new Error('response body did not contain an access_token')); }

        if (!response.body.access_token.payload) { return throwError(new Error('Access token in response body did not contain a decoded payload')); }

        response.body.access_token.payload.client_id = client_id;

        return of(response);

      })
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
