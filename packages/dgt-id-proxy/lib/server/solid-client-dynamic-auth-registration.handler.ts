
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { getPod } from '../util/get-pod';
import { validateWebID } from '../util/validate-webid';

export class SolidClientDynamicAuthRegistrationHandler extends HttpHandler {

  constructor(
    private registration_uri: string,
    private store: KeyValueStore<string, any>,
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

    return from(getPod(client_id))
      .pipe(
        switchMap((response) => {

          if (response.headers.get('content-type') !== 'text/turtle') {

            return throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`));

          }

          return from(response.text());

        }),
        switchMap((text) => validateWebID(text, client_id, redirect_uri)),
        switchMap((text) => zip(of(text), from(this.store.get(client_id)))),
        switchMap(([ podData, registerData ]) => {

          this.comparePodDataWithRequest(podData, context);

          return this.compareWithStoreAndRegister(podData, registerData, client_id);

        }),
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

  createRequestData(podData: any) {

    const metadata = [ 'response_types', 'grant_types', 'application_type', 'contacts', 'client_name', 'logo_uri', 'client_uri', 'policy_uri', 'tos_uri', 'jwks_uri', 'jwks', 'sector_identifier_uri', 'subject_type', 'id_token_signed_response_alg', 'id_token_encrypted_response_alg', 'id_token_encrypted_response_enc', 'userinfo_signed_response_alg', 'userinfo_encrypted_response_alg', 'userinfo_encrypted_response_enc', 'request_object_signing_alg', 'request_object_encryption_alg', 'request_object_encryption_enc', 'token_endpoint_auth_method', 'token_endpoint_auth_signing_alg', 'default_max_age', 'require_auth_time', 'default_acr_values', 'initiate_login_uri', 'request_uris' ];

    const reqData = {
      'redirect_uris':  podData.redirect_uris,
      'scope': podData.scope,
      'token_endpoint_auth_method' : 'none',
    };

    metadata.map((item) => {

      if (podData[item]) {

        reqData[item] = podData[item];

      }

    });

    return reqData;

  }

  comparePodDataWithRequest(podData: any, context: HttpHandlerContext): void{

    for(const key of context.request.url.searchParams.keys()){

      if (podData[key]){

        if (key === 'scope') {

          context.request.url.searchParams.get(key)
            .split(' ')
            .map((scope) => {

              if (!podData[key].split(' ').includes(scope)) {

                throw new Error('Scope not found in pod');

              }

            });

        }

      }

      if (key === 'response_type' && !podData.response_types.includes(context.request.url.searchParams.get(key)))  {

        throw new Error('Response types do not match');

      }

    }

  }

  async compareWithStoreAndRegister(podData: any, registerData: any, client_id: string) {

    const reqData = this.createRequestData(podData);

    if (!registerData) {

      const regResponse = await this.registerClient(reqData);
      this.store.set(client_id, regResponse);

      return regResponse;

    }

    for(const item of Object.keys(podData)){

      if(item !== 'client_id'){

        if (JSON.stringify(registerData[item]) !== JSON.stringify(podData[item])){

          const alteredRegResponse = await this.registerClient(reqData);
          this.store.set(client_id, alteredRegResponse);

          return alteredRegResponse;

        }

      }

    }

    return registerData;

  }

}
