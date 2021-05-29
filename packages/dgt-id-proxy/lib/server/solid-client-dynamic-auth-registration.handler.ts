
import { ForbiddenHttpError, HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { getWebID } from '../util/get-webid';
import { OidcRegistrationJSON } from '../util/oidc-registration-json';
import { parseQuads, getOidcRegistrationTriple } from '../util/process-webid';
import { RegistrationResponseJSON } from '../util/registration-response-json';

export class SolidClientDynamicAuthRegistrationHandler extends HttpHandler {

  constructor(
    private registration_uri: string,
    private store: KeyValueStore<string, Partial<OidcRegistrationJSON>>,
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

  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
    && context.request
    && context.request.url
      ? of(true)
      : of(false);

  }

  async registerClient(data: Partial<OidcRegistrationJSON>): Promise<Partial<RegistrationResponseJSON>> {

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

  createRequestData(clientData: Partial<OidcRegistrationJSON>): Partial<OidcRegistrationJSON> {

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
    clientData: Partial<OidcRegistrationJSON>,
    searchParams: URLSearchParams
  ): Observable<Partial<OidcRegistrationJSON>>{

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
    clientData: Partial<OidcRegistrationJSON>,
    registerData: Partial<RegistrationResponseJSON>,
    client_id: string,
    reqData: Partial<OidcRegistrationJSON>
  ): Promise<Partial<RegistrationResponseJSON>>  {

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
