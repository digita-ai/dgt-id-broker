import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';
import { recalculateContentLength } from '../util/recalculate-content-length';
import { getClientRegistrationData } from '../util/process-client-registration-data';
import { OidcClientMetadata } from '../util/oidc-client-metadata';

/**
 * A {HttpHandler} that
 * - gets the client registration data and retrieves oidcRegistration
 * - checks the if the registration data is valid and compares the grant types
 * - replaces the client id, client secret and redirect url in the context
 */
export class ClientIdStaticTokenHandler extends HttpHandler {

  private logger = getLoggerFor(this, 5, 5);

  /**
   * Creates a { ClientIdStaticTokenHandler }.
   *
   * @param { HttpHandler } httpHandler - the handler through which to pass requests.
   * @param { string } clientId - the client_id of the static client configured on the upstream server.
   * @param { string } clientSecret - the client secret used to the static client configured on the upstream server.
   * @param { string } redirectUri - the redirectUri of the static client on the upstream server.
   */
  constructor(
    private httpHandler: HttpHandler,
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
  ){

    super();

    if (!httpHandler) { throw new Error('No handler was provided'); }

    if (!clientId) { throw new Error('No clientId was provided'); }

    if (!clientSecret) { throw new Error('No clientSecret was provided'); }

    if (!redirectUri) { throw new Error('No redirectUri was provided'); }

    try {

      new URL(redirectUri);

    } catch (e) {

      this.logger.warn('The registration_uri is not a valid url', redirectUri);

      throw new Error('redirectUri must be a valid URI');

    }

  }

  /**
   * Handles the context. Checks that the request contains a client id, grant type and redirect uri.
   * It retrieves the information from the registration data of the given client id.
   * Checks if the response is of the expected turtle type.
   * Parses the turtle response into Quads and retrieves the required oidcRegistration triple
   * so it knows if it's a valid registration data.
   * It replaces the client id, client secret and redirect url in the context with the one given to the constructor.
   * and recalculates the content length because the body has changed
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {

      this.logger.verbose('No context provided', context);

      return throwError(() => new Error('A context must be provided'));

    }

    if (!context.request) {

      this.logger.verbose('No request was provided', context.request);

      return throwError(() => new Error('No request was included in the context'));

    }

    if (!context.request.body) {

      this.logger.verbose('No body was provided', context.request.body);

      return throwError(() => new Error('No body was included in the request'));

    }

    const params  = new URLSearchParams(context.request.body);
    const client_id = params.get('client_id');

    if (!client_id) {

      this.logger.warn('No client id was provided', client_id);

      return throwError(() => new Error('No client_id was provided'));

    }

    const grant_type = params.get('grant_type');

    if (!grant_type) {

      this.logger.warn('No grant type was provided', grant_type);

      return throwError(() => new Error('No grant_type was provided'));

    }

    if (grant_type !== 'authorization_code' && grant_type !== 'refresh_token') {

      this.logger.warn('The grant type is not supported', grant_type);

      return throwError(() => new Error('grant_type must be either "authorization_code" or "refresh_token"')) ;

    }

    const redirect_uri = params.get('redirect_uri');

    if (grant_type === 'authorization_code' && !redirect_uri) {

      this.logger.warn('No redirect uri was provided', redirect_uri);

      return throwError(() => new Error('No redirect_uri was provided'));

    }

    const refresh_token = params.get('refresh_token');

    if (grant_type === 'refresh_token' && !refresh_token) {

      this.logger.warn('No refresh token was provided', refresh_token);

      return throwError(() => new Error('No refresh_token was provided'));

    }

    try {

      new URL(client_id);

    } catch (error) {

      this.logger.warn('The client id is not a valid url', client_id);

      return this.httpHandler.handle(context);

    }

    return of(client_id).pipe(
      switchMap((clientId) => clientId === 'http://www.w3.org/ns/solid/terms#PublicOidcClient' ? of({}) : this.checkClientRegistrationData(clientId, grant_type)),
      map(() => {

        params.set('client_id', this.clientId);
        params.set('client_secret', this.clientSecret);
        if (grant_type === 'authorization_code') params.set('redirect_uri', this.redirectUri);

        return { ...context, request: { ...context.request, body: params.toString() } };

      }),
      switchMap((newContext) => zip(of(newContext), of(recalculateContentLength(newContext.request)))),
      tap(([ newContext, length ]) => newContext.request.headers['content-length'] = length),
      switchMap(([ newContext ]) => this.httpHandler.handle(newContext)),
      switchMap((response) => {

        if (!response.body.access_token) {

          this.logger.verbose('No access token was provided', response.body);

          return throwError(() => new Error('response body did not contain an access_token'));

        }

        if (!response.body.access_token.payload) {

          this.logger.verbose('No access token payload was provided', response.body.access_token);

          return throwError(() => new Error('Access token in response body did not contain a decoded payload'));

        }

        response.body.access_token.payload.client_id = client_id;
        response.body.id_token.payload.aud = client_id;

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

    this.logger.info('Checking canHandle', context);

    return context
    && context.request
    && context.request.body
      ? of(true)
      : of(false);

  }

  private checkClientRegistrationData(clientId: string, grantType: string): Observable<OidcClientMetadata> {

    this.logger.info(`Checking client registration data for clientId: ${clientId} for grantType: `, grantType);

    return from(getClientRegistrationData(clientId))
      .pipe(
        switchMap((registrationData) => (registrationData.grant_types?.includes(grantType))
          ? of(registrationData)
          : (throwError(() => new Error('The grant type in the request is not included in the client registration data')))),
      );

  }

}
