
import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';
import { OidcClientMetadata } from '../util/oidc-client-metadata';
import { CombinedRegistrationData, RegistrationStore, retrieveAndValidateClientRegistrationData } from '../util/process-client-registration-data';

/**
 * A { Handler<HttpHandlerContext, HttpHandlerContext> } that
 * - checks if a client is already registered
 * - compares the client registration data with the request data
 * - compares the store data with the client registration data
 * - registers if not registered or information is updated
 * - stores the registration in the keyvalue store
 */
export class ClientIdDynamicAuthRequestHandler extends Handler<HttpHandlerContext, HttpHandlerContext> {

  private logger = getLoggerFor(this, 2, 2);

  /**
   * Creates a { ClientIdDynamicAuthRequestHandler }.
   *
   * @param { string } registration_uri - the registration endpoint for the currently used provider.
   * @param { KeyValueStore } store - the store used to save a clients register data.
   */
  constructor(
    private registration_uri: string,
    private store: RegistrationStore,
  ) {

    super();

    if (!registration_uri) { throw new Error('A registration_uri must be provided'); }

    try {

      new URL(registration_uri);

    } catch (error) {

      throw new Error('The provided registration_uri is not a valid URL');

    }

    if (!store) { throw new Error('A store must be provided'); }

  }

  /**
   * Handles the context. Checks that the request contains a client id and redirect uri.
   * It retrieves the information from the registration data of the given client id.
   * Checks if the response is of the expected turtle type.
   * Parses the turtle response into Quads and retrieves the required oidcRegistration triple
   * Compares the client registration data with the request data and checks if the client id is already registered
   * Compares the client registration with the register data in the store and if not the same registers again with the new data.
   * If nothing changed it doesn't register.
   * It replaces the given client id in the context with the random client id it retrieved from the registration endpoint
   *
   * @param { HttpHandlerContext } context - The context of the incoming request.
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerContext> {

    if (!context) {

      this.logger.verbose('No context provided', context);

      return throwError(() => new Error('A context must be provided'));

    }

    if (!context.request) {

      this.logger.verbose('No request was provided', context.request);

      return throwError(() => new Error('No request was included in the context'));

    }

    if (!context.request.url) {

      this.logger.verbose('No url was provided', context.request.url);

      return throwError(() => new Error('No url was included in the request'));

    }

    const client_id = context.request.url.searchParams.get('client_id');
    const redirect_uri = context.request.url.searchParams.get('redirect_uri');

    if (!client_id) {

      this.logger.warn('No client id was provided', client_id);

      return throwError(() => new Error('No client_id was provided'));

    }

    if (!redirect_uri) {

      this.logger.warn('No redirect uri was provided', redirect_uri);

      return throwError(() => new Error('No redirect_uri was provided'));

    }

    try {

      new URL(client_id);

    } catch (error) {

      this.logger.error('The client id is not a valid url', client_id);

      return of(context);

    }

    return of(client_id).pipe(
      switchMap((clientId) => clientId === 'http://www.w3.org/ns/solid/terms#PublicOidcClient'
        ? this.checkRedirectUri(clientId, redirect_uri)
        : this.checkClientRegistrationData(clientId, context.request.url.searchParams)),
      tap((res) => context.request.url.searchParams.set('client_id', res.client_id)),
      tap(() => context.request.url.search = context.request.url.searchParams.toString()),
      mapTo(context),
    );

  }

  /**
   * Confirms if the handler can handle the context by checking if a request and request URL object is present.
   *
   * @param {HttpHandlerContext} context - The context containing the request to handle.
   * @returns Boolean stating if the context can be handled or not.
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    this.logger.info('Checking canHandle', context);

    return context
    && context.request
    && context.request.url
      ? of(true)
      : of(false);

  }

  /**
   *
   * Creates a fetch request to the registration endpoint
   * to register the client with the given data
   * and returns a JSON of the response and saves
   * this response in the KeyValue store with the client id as key.
   *
   * @param { OidcClientMetadata } data - The clients metadata to register with.
   * @param { string } client_id - E.g. a URI to a web id profile.
   * @returns Object containing the registration data received from the registration endpoint.
   */
  async registerClient(
    data: OidcClientMetadata,
    client_id: string,
    redirect_uri?: string,
  ): Promise<CombinedRegistrationData> {

    this.logger.info('Registering client', { data, client_id });

    const response = await fetch(this.registration_uri, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response) this.logger.error(`Failed to register ${client_id} with data: `, data);

    const regResponse = await response.json();
    redirect_uri ? this.store.set(redirect_uri, regResponse) : this.store.set(client_id, regResponse);

    this.logger.info(`Registered ${client_id} with data: `, data);

    return regResponse;

  }

  /**
   * Creates a the request data to send to the registration endpoint.
   * It combines all the parameters that are possible for a register request
   * that are present in the client registration data.
   *
   * @param { OidcClientMetadata } clientData - The client registration data found in the webid.
   * @returns The request data to send to the registration endpoint containing
   * only the possible parameters for a register request that were found in the clientData.
   */
  createRequestData(clientData: OidcClientMetadata): OidcClientMetadata {

    const metadata = [
      'response_types',
      'grant_types',
      'application_type',
      'contacts',
      'client_name',
      'logo_uri',
      'client_uri',
      'policy_uri',
      'tos_uri',
      'jwks_uri',
      'jwks',
      'scope',
      'sector_identifier_uri',
      'subject_type',
      'id_token_signed_response_alg',
      'id_token_encrypted_response_alg',
      'id_token_encrypted_response_enc',
      'userinfo_signed_response_alg',
      'userinfo_encrypted_response_alg',
      'userinfo_encrypted_response_enc',
      'request_object_signing_alg',
      'request_object_encryption_alg',
      'request_object_encryption_enc',
      'token_endpoint_auth_method',
      'token_endpoint_auth_signing_alg',
      'default_max_age',
      'require_auth_time',
      'default_acr_values',
      'initiate_login_uri',
      'request_uris',
    ];

    const reqData: OidcClientMetadata = {
      'redirect_uris': clientData.redirect_uris,
      'token_endpoint_auth_method': 'none',
    };

    metadata.map((item) => {

      if (clientData[item]) { reqData[item] = clientData[item]; }

    });

    this.logger.info('Created request data', reqData);

    return reqData;

  }

  /**
   * Compares the data in the store with one in the client registration, to check if the registration is not updated.
   * If the in the data is changed the client registers again with the new data.
   * If registered again it saves the new register data in the KeyValue store.
   * If nothing changed, there is no new registration and the registerData is straight returned.
   *
   * @param { OidcClientMetadata } clientData - The data retrieved from the webid.
   * @param { CombinedRegistrationData } registerData - The data retrieved from the store.
   * @returns { boolean } - Boolean stating if the data in the store is different from the data in the webid.
   */
  clientRegistrationDataChanged(
    clientData: OidcClientMetadata,
    registerData: CombinedRegistrationData,
  ): boolean {

    return !registerData || Object.keys(clientData).some((key) =>
      this.compareClientRegistrationParameter(clientData[key], registerData[key], key));

  }
  /**
   * Compares each of the registration items to check if they are equal, or lists both contain the item.
   *
   * @param { unknown } clientDataItem - The item from the client registration data (data retrieved from the webid) to compare.
   * @param { unknown } registerDataItem - The item from the registration data (data retrieved from the key value store) to compare.
   * @param { string } key - The key of the item to compare.
   * @returns Confirms whether the items are equal.
   */
  compareClientRegistrationParameter(clientDataItem: unknown, registerDataItem: unknown, key: string): boolean {

    if (([ 'client_id', 'scope', '@context' ].includes(key))) { return false; }

    if (Array.isArray(clientDataItem) && Array.isArray(registerDataItem)) {

      const a = new Set(registerDataItem);
      const b = new Set(clientDataItem);

      return (!(a.size === b.size && [ ...a ].every((value) => b.has(value))));

    }

    this.logger.info('Checking if registration data has changed: ', (registerDataItem !== clientDataItem));

    return (registerDataItem !== clientDataItem);

  }

  /**
   * If the clientId is a public WebId it checks if the client
   * was already registered in the store with this redirectUri as key
   * and if not registers the with the data from the client registration data, clientId and redirectUri
   *
   * @param { string } clientId : the clientId (public webid) provided in the request
   * @param { string } redirectUri : the redirectUri provided in the request
   * @returns Returns the registration data either retrieved from the store
   * when already registered or from the response from the registration endpoint upon registering.
   */
  private checkRedirectUri(
    clientId: string,
    redirectUri: string
  ): Observable<CombinedRegistrationData> {

    const clientData: { [key: string]: string | number | boolean | string[] | undefined } = {
      redirect_uris: [ redirectUri ],
      token_endpoint_auth_method : 'none',
    };

    return from(this.store.get(redirectUri)).pipe(
      switchMap((registerData) => {

        this.logger.info(`Retrieved register data for ${redirectUri}: `, registerData);

        return registerData
          ? of(registerData)
          : this.registerClient(clientData, clientId, redirectUri);

      }),
    );

  }

  /**
   * Calls retrieveAndValidateClientRegistrationData, checks if client is already registered,
   * calls compareClientRegistrationDataWithStore and registers if not registered yet or if something changed.
   *
   * @param { string } clientId - The clientId (client registration data) provided in the request.
   * @param { URLSearchParams } contextRequestUrlSearchParams - The URL parameters given in the request.
   * @returns Returns the registration data either retrieved from the store
   * when already registered or from the response from the registration endpoint upon registering.
   */
  private checkClientRegistrationData(
    clientId: string,
    contextRequestUrlSearchParams: URLSearchParams
  ): Observable<CombinedRegistrationData> {

    return retrieveAndValidateClientRegistrationData(clientId, contextRequestUrlSearchParams).pipe(
      switchMap((clientData) => zip(of(clientData), from(this.store.get(clientId)))),
      switchMap(([ clientData, registerData ]) =>
        !registerData || this.clientRegistrationDataChanged(clientData, registerData)
          ? this.registerClient(this.createRequestData(clientData), clientId)
          : of(registerData))
    );

  }

}
