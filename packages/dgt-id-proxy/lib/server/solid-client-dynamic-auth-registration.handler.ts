
import { ForbiddenHttpError, HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { OidcClientMetadata } from '../util/oidc-client-metadata';
import { parseQuads, getOidcRegistrationTriple, getWebID } from '../util/process-webid';
import { OidcClientRegistrationResponse } from '../util/oidc-client-registration-response';

/**
 * A { HttpHandler } that
 * - checks if a client is already registered
 * - compares the data of the webid with the request data
 * - compares the store data with the webid data
 * - registers if not registered or information is updated
 * - stores the registration in the keyvalue store
 */
export class SolidClientDynamicAuthRegistrationHandler extends HttpHandler {

  /**
   * Creates a { SolidClientDynamicAuthRegistrationHandler }.
   *
   * @param {string} registration_uri - the registration endpoint for the currently used provider.
   * @param { KeyValueStore } store - the store used to save a clients register data.
   * @param {HttpHandler} httpHandler - the handler through which to pass requests
   */
  constructor(
    private registration_uri: string,
    private store: KeyValueStore<string, Partial<OidcClientMetadata & OidcClientRegistrationResponse>>,
    private httpHandler: HttpHandler
  ) {

    super();

    if (!registration_uri) {

      throw new Error('A registration_uri must be provided');

    }

    try {

      const url = new URL(registration_uri);

    } catch (error) {

      throw new Error('The provided registration_uri is not a valid URL');

    }

    if (!store) {

      throw new Error('A store must be provided');

    }

    if (!httpHandler) {

      throw new Error('A HttpHandler must be provided');

    }

  }

  /**
   * Handles the context. Checks that the request contains a client id and redirect uri. If it does,
   * it checks that the redirect uri is a valid uri.
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
        switchMap((response) => {

          if (response.headers.get('content-type') !== 'text/turtle') {

            return throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`));

          }

          return from(response.text());

        }),
        map((text) => parseQuads(text)),
        switchMap((quads) => getOidcRegistrationTriple(quads)),
        switchMap(((clientData) => zip(
          this.compareClientDataWithRequest(clientData, context.request.url.searchParams),
          from(this.store.get(client_id))
        ))),
        switchMap(([ clientData, registerData ]) => this.compareWithStoreAndRegister(
          clientData,
          registerData,
          client_id,
          this.createRequestData(clientData)
        )),
        tap((res) => context.request.url.search = context.request.url.search.replace(new RegExp('client_id=+[^&.]+'), `client_id=${res.client_id}`)),
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

  /**
   * Creates a fetch request to the registration endpoint
   * to register the client with the given data
   * and returns a JSON of the response.
   *
   * @param {HttpHandlerContext} context
   */
  async registerClient(data: any) {

    const response = await fetch(this.registration_uri, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return response.json();

  }

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
      'redirect_uris':  clientData.redirect_uris,
      'scope': clientData.scope,
      'token_endpoint_auth_method' : 'none',
    };

    metadata.map((item) => {

      if (clientData[item]) {

        reqData[item] = clientData[item];

      }

    });

    return reqData;

  }

  compareClientDataWithRequest(
    clientData: Partial<OidcClientMetadata>,
    searchParams: URLSearchParams
  ): Observable<Partial<OidcClientMetadata>>{

    if (clientData.client_id !== searchParams.get('client_id')) {

      return throwError(new ForbiddenHttpError('The client id in the request does not match the one in the WebId'));

    }

    if (!clientData.redirect_uris.includes(searchParams.get('redirect_uri'))) {

      return throwError(new ForbiddenHttpError('The redirect_uri in the request is not included in the WebId'));

    }

    if (!clientData.response_types.includes(searchParams.get('response_type')))  {

      return throwError(new ForbiddenHttpError('Response types do not match'));

    }

    if (clientData.scope) {

      const clientScopes = clientData.scope.split(' ');

      for (const scope of searchParams.get('scope').split(' ')) {

        if (!clientScopes.includes(scope)) {

          return throwError(new ForbiddenHttpError('The provided scope was not found in your webid'));

        }

      }

    } else {

      return throwError(new ForbiddenHttpError('No scope defined in the webid'));

    }

    return of(clientData);

  }

  async compareWithStoreAndRegister(
    clientData: Partial<OidcClientMetadata>,
    registerData: Partial<OidcClientMetadata & OidcClientRegistrationResponse>,
    client_id: string,
    reqData: Partial<OidcClientMetadata>
  ): Promise<Partial<OidcClientMetadata & OidcClientRegistrationResponse>>  {

    if (!registerData) {

      const regResponse = await this.registerClient(reqData);
      this.store.set(client_id, regResponse);

      return regResponse;

    }

    for (const item of Object.keys(clientData)) {

      if (item !== 'client_id' && JSON.stringify(registerData[item]) !== JSON.stringify(clientData[item])){

        const alteredRegResponse = await this.registerClient(reqData);
        this.store.set(client_id, alteredRegResponse);

        return alteredRegResponse;

      }

    }

    return registerData;

  }

}
