
import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { OidcClientMetadata } from '../util/oidc-client-metadata';
import { OidcClientRegistrationResponse } from '../util/oidc-client-registration-response';
import { ClientIdAuthRequestHandler } from './client-id-auth-request.handler';

/**
 * A { Handler<HttpHandlerContext, HttpHandlerContext> } that
 * - checks if a client is already registered
 * - compares the data of the webid with the request data
 * - compares the store data with the webid data
 * - registers if not registered or information is updated
 * - stores the registration in the keyvalue store
 */
export class ClientIdDynamicAuthRequestHandler extends ClientIdAuthRequestHandler {

  /**
   * Creates a { ClientIdDynamicAuthRequestHandler }.
   *
   * @param {string} registration_uri - the registration endpoint for the currently used provider.
   * @param { KeyValueStore } store - the store used to save a clients register data.
   */
  constructor(
    private registration_uri: string,
    private store: KeyValueStore<string, Partial<OidcClientMetadata & OidcClientRegistrationResponse>>
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
   * It retrieves the information from the webid of the given client id.
   * Checks if the response is of the expected turtle type.
   * Parses the turtle response into Quads and retrieves the required oidcRegistration triple
   * Compares the webid data with the request data and checks if the client id is already registered
   * Compares the webid with the register data in the store and if not the same registers again with the new data.
   * If nothing changed it doesn't register.
   * It replaces the given client id in the context with the random client id it retrieved from the registration endpoint
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerContext> {

    if (!context) { return throwError(new Error('A context must be provided')); }

    if (!context.request) { return throwError(new Error('No request was included in the context')); }

    if (!context.request.url) { return throwError(new Error('No url was included in the request')); }

    const client_id = context.request.url.searchParams.get('client_id');
    const redirect_uri = context.request.url.searchParams.get('redirect_uri');

    if (!client_id) { return throwError(new Error('No client_id was provided')); }

    if (!redirect_uri) { return throwError(new Error('No redirect_uri was provided')); }

    try {

      new URL(client_id);

    } catch (error) {

      return of(context);

    }

    return of(client_id).pipe(
      switchMap((clientId) => clientId === 'http://www.w3.org/ns/solid/terms#PublicOidcClient'
        ? this.checkRedirectUri(clientId, redirect_uri)
        : this.checkWebId(clientId, context.request.url.searchParams)),
      tap((res) => context.request.url.searchParams.set('client_id', res.client_id)),
      tap(() => context.request.url.search = context.request.url.searchParams.toString()),
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

  /**
   *
   * Creates a fetch request to the registration endpoint
   * to register the client with the given data
   * and returns a JSON of the response and saves
   * this response in the KeyValue store with the client id as key.
   *
   * @param { Partial<OidcClientMetadata> } data
   * @param { string } client_id
   */
  async registerClient(
    data: Partial<OidcClientMetadata>,
    client_id: string,
    redirect_uri?: string,
  ): Promise<Partial<OidcClientMetadata & OidcClientRegistrationResponse>> {

    const response = await fetch(this.registration_uri, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const regResponse = await response.json();
    redirect_uri ? this.store.set(redirect_uri, regResponse) : this.store.set(client_id, regResponse);

    return regResponse;

  }

  /**
   * Creates a the request data to send to the registration endpoint.
   * It combines all the parameters that are possible for a register request
   * that are present in the webid.
   *
   * @param { Partial<OidcClientMetadata> } clientData
   */
  createRequestData(clientData: Partial<OidcClientMetadata>): Partial<OidcClientMetadata> {

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

    const reqData = {
      'redirect_uris': clientData.redirect_uris,
      'token_endpoint_auth_method' : 'none',
    };

    metadata.map((item) => {

      if (clientData[item]) { reqData[item] = clientData[item]; }

    });

    return reqData;

  }

  /**
   * Compares the data in the store with one in the webid, to check if the webid is not updated.
   * If the in the webid is changed the client registers again with the new data.
   * If registered again it saves the new register data in the KeyValue store.
   * If nothing changed, there is no new registration and the registerData is straight returned.
   *
   * @param { Partial<OidcClientMetadata> } clientData - the data retrieved from the webid.
   * @param { Partial<OidcClientMetadata & OidcClientRegistrationResponse> } registerData - the data retrieved from the store.
   */
  compareWebIdDataWithStore(
    clientData: Partial<OidcClientMetadata>,
    registerData: Partial<OidcClientMetadata & OidcClientRegistrationResponse>,
  ): boolean {

    if (!registerData) { return true; }

    for (const item of Object.keys(clientData)) {

      if ((item !== 'client_id' && item !== 'scope' && item !== '@context')  && JSON.stringify(registerData[item]) !== JSON.stringify(clientData[item])){

        return true;

      }

    }

    return false;

  }

  /**
   * If the clientId is a public WebId it checks if the client
   * was already registered in the store with this redirectUri as key
   * and if not registers the with the data from the WebId, clientId and redirectUri
   *
   * @param { string } clientId : the clientId (webId) provided in the request
   * @param { string } redirectUri : the redirectUri provided in the request
   */
  private checkRedirectUri(
    clientId: string,
    redirectUri: string
  ): Observable<Partial<OidcClientMetadata & OidcClientRegistrationResponse>> {

    const clientData = {
      'redirect_uris': [ redirectUri ],
      'token_endpoint_auth_method' : 'none',
    };

    return from(this.store.get(redirectUri)).pipe(
      switchMap((registerData) => registerData
        ? of(registerData)
        : this.registerClient(clientData, clientId, redirectUri)),
    );

  }

  /**
   * Calls retrieveAndValidateWebId, checks if client is already registered,
   * calls compareWebIdDataWithStore and registers if not registered yet or if something changed.
   *
   * @param { string } clientId: the clientId (webId) provided in the request
   * @param { URLSearchParams } contextRequestUrlSearchParams: the URL parameters given in the request
   */
  private checkWebId(
    clientId: string,
    contextRequestUrlSearchParams: URLSearchParams
  ): Observable<Partial<OidcClientMetadata & OidcClientRegistrationResponse>> {

    return this.retrieveAndValidateWebId(clientId, contextRequestUrlSearchParams).pipe(
      switchMap((clientData) => zip(of(clientData), from(this.store.get(clientId)))),
      switchMap(([ clientData, registerData ]) => this.compareWebIdDataWithStore(clientData, registerData)
        ? this.registerClient(this.createRequestData(clientData), clientId)
        : of(registerData))
    );

  }

}
