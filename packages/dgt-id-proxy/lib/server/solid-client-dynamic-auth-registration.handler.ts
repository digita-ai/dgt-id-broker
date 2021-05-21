
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { getPod } from '../util/get-pod';
import { validateWebID } from '../util/validate-webid';

export class SolidClientDynamicAuthRegistrationHandler extends HttpHandler {

  constructor(private store: KeyValueStore<string, any>, private httpHandler: HttpHandler) {

    super();

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

          const reqData = {
            'redirect_uris': podData.redirect_uris,
            'client_uri': podData.client_uri,
            'logo_uri': podData.logo_uri,
            'tos_uri': podData.tos_uri,
            'scope': podData.scope,
            'default_max_age': podData.default_max_age,
            'require_auth_time': podData.require_auth_time,
            'grant_types': podData.grant_types,
            'response_types': podData.response_types,
            'token_endpoint_auth_method' : 'none',
          };

          this.compareData(podData, context);

          return registerData
            ? from(this.registerClient({ ...reqData, 'redirect_uris': [ redirect_uri ], 'scope':  context.request.url.searchParams.get('scope'), 'response_types': [ context.request.url.searchParams.get('response_type') ] }))
            : from(this.registerClient(reqData));

        }),
        tap((res) => this.store.set(client_id, res)),
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

    const url = `http://localhost:3000/reg`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return response.json();

  }

  compareData(podData: any, context: HttpHandlerContext){

    const metadata = [ 'response_types', 'grant_types', 'application_type', 'contacts', 'client_name', 'logo_uri', 'client_uri', 'policy_uri', 'tos_uri', 'jwks_uri', 'jwks', 'sector_identifier_uri', 'subject_type', 'id_token_signed_response_alg', 'id_token_encrypted_response_alg', 'id_token_encrypted_response_enc', 'userinfo_signed_response_alg', 'userinfo_encrypted_response_alg', 'userinfo_encrypted_response_enc', 'request_object_signing_alg', 'request_object_encryption_alg', 'request_object_encryption_enc', 'token_endpoint_auth_method', 'token_endpoint_auth_signing_alg', 'default_max_age', 'require_auth_time', 'default_acr_values', 'initiate_login_uri', 'request_uris' ];

    const reqData = {
      'token_endpoint_auth_method' : 'none',
    };

    metadata.map((item) => {

      reqData[item] = podData[item];

    });

    // for(const item in context.request.url.searchParams.keys()){

    //   if (metadata.includes(item)) {

    //     if (context.request.url.searchParams.get(item) && podData[item]) {

    //       return podData[item] !== context.request.url.searchParams.get(item)
    //         ? throwError(new Error('The request parameters do not match the pod'))
    //         : of(reqData);

    //     }

    //   }

    // }

    // Object.keys(podData).map((item) => {

    //   const param = context.request.url.searchParams.get(item);

    //   if (param) {

    //     console.log(podData[item], 'vs', param);

    //     if(podData[item] !== param){

    //       throw new Error('Data does not match');

    //     }

    //   }

    // });

  }

}
