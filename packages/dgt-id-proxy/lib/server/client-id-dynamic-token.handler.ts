import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap, map, mapTo } from 'rxjs/operators';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';
import { checkError, createErrorResponse } from '../public-api';
import { RegistrationStore } from '../util/process-client-registration-data';
import { recalculateContentLength } from '../util/recalculate-content-length';

/**
 * A { HttpHandler } that
 * - gets the registered data from the store and if not errors
 * - replaces the client id in the body with the registered random client id in the store
 * - recalculates the content length because the body has changed
 * - handles the request
 */
export class ClientIdDynamicTokenHandler extends HttpHandler {

  private logger = getLoggerFor(this, 2, 2);

  /**
   * Creates a { ClientIdDynamicTokenHandler }.
   *
   * @param { KeyValueStore } store - The store used to retrieve a client's register data.
   * @param { HttpHandler } httpHandler - The handler through which to pass requests.
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
   * @param {HttpHandlerContext} context - The context of the incoming request.
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {

      this.logger.verbose('No context was provided', context);

      return throwError(() => new Error('A context must be provided'));

    }

    if (!context.request) {

      this.logger.verbose('No request was provided', context.request);

      return throwError(() => new Error('No request was included in the context'));

    }

    if (!context.request.body) {

      this.logger.verbose('No request body was provided', context.request.body);

      return throwError(() => new Error('No body was included in the request'));

    }

    const params  = new URLSearchParams(context.request.body);
    const client_id = params.get('client_id');

    if (!client_id) {

      this.logger.warn('No client_id was provided', client_id);

      return throwError(() => new Error('No client_id was provided'));

    }

    const grant_type = params.get('grant_type');

    if (grant_type !== 'authorization_code' && grant_type !== 'refresh_token') {

      this.logger.warn('Grant type is not supported', grant_type);

      return throwError(() => new Error('grant_type must be either "authorization_code" or "refresh_token"')) ;

    }

    const refresh_token = params.get('refresh_token') ?? '';

    if (grant_type === 'refresh_token' && refresh_token === '') {

      this.logger.warn(`Refresh token is required for grant_type ${grant_type}`, refresh_token);

      return throwError(() => new Error('No refresh_token was provided'));

    }

    const redirect_uri = params.get('redirect_uri') ?? '';

    if (grant_type === 'authorization_code' && redirect_uri === '') { return throwError(() => new Error('No redirect_uri was provided')); }

    try {

      new URL(client_id);

    } catch (error) {

      this.logger.warn('The client_id is not a valid url', client_id);

      return this.httpHandler.handle(context);

    }

    return from(this.store.get(client_id === 'http://www.w3.org/ns/solid/terms#PublicOidcClient' ? (grant_type === 'authorization_code' ? redirect_uri : refresh_token) : client_id)).pipe(

      switchMap((registerInfo) => {

        if (registerInfo) return of(registerInfo);

        this.logger.warn('No register info was found for client_id', client_id);

        return throwError(() => new Error('No data was found in the store'));

      }),
      map((registerInfo) => {

        params.set('client_id', registerInfo.client_id);

        this.logger.info('Setting client_id to the one received from the register endpoint: ', registerInfo.client_id);

        return { ...context, request: { ...context.request, body: params.toString() } };

      }),
      switchMap((newContext) => zip(of(newContext), of(recalculateContentLength(newContext.request)))),
      tap(([ newContext, length ]) => newContext.request.headers['content-length'] = length),
      switchMap(([ newContext ]) => {

        this.logger.info('Handling context', newContext);

        return this.httpHandler.handle(newContext);

      }),
      switchMap((response) => zip(of(response), of(checkError(response)))),
      switchMap(([ response, isError ]) => {

        if (isError) {

          this.logger.error('Response has errored', isError.error);

          return of(createErrorResponse(isError.error_description, isError.error, response.headers));

        } else {

          if (!response.body.access_token) {

            this.logger.verbose('Response has no access token', response.body);

            return throwError(() => new Error('response body did not contain an access_token'));

          }

          if (!response.body.access_token.payload) {

            this.logger.verbose('Response has no access token payload', response.body.access_token);

            return throwError(() => new Error('Access token in response body did not contain a decoded payload'));

          }

          this.logger.info('Switching client id in response payload', response.body.access_token.payload);

          response.body.access_token.payload.client_id = client_id;

          return of(response);

        }

      }),
      switchMap((response) => {

        if (client_id === 'http://www.w3.org/ns/solid/terms#PublicOidcClient' && grant_type === 'authorization_code' && response.body.refresh_token) {

          this.logger.info('Client id is public, retrieving register info from store', client_id);

          return from(this.store.get(redirect_uri)).pipe(
            map((registerInfo) => {

              if (registerInfo) {

                this.logger.info('Deleting redirect_uri from store', redirect_uri);
                this.store.delete(redirect_uri);
                this.logger.info('Pairing  refresh token to register info in store', { refresh_token, registerInfo });
                this.store.set(response.body.refresh_token, registerInfo);

              }

            }),
            mapTo(response),
          );

        }

        return of(response);

      })
    );

  }

  /**
   * Confirms that the handler can handle the given context if it contains a request and request body.
   *
   * @param { HttpHandlerContext } context - The context of the incoming request.
   * @returns Boolean stating if the context can be handled or not.
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    this.logger.info('Checking canHandle', context);

    return context
    && context.request
    && context.request.body
      ? of(true)
      : of(false);

  }

}
