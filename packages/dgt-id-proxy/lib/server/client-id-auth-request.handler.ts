import { Observable,  throwError, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { HttpHandler } from '@digita-ai/handlersjs-http';
import { OidcClientMetadata } from '../util/oidc-client-metadata';
import { OidcClientRegistrationResponse } from '../util/oidc-client-registration-response';
import { parseQuads, getOidcRegistrationTriple, getWebID } from '../util/process-webid';
import { compareClientDataWithRequest } from '../util/request-data-comparison';

export abstract class ClientIdAuthRequestHandler extends HttpHandler {

  retrieveAndValidateWebId = (
    clientId: string,
    contextRequestUrlSearchParams: URLSearchParams
  ): Observable<Partial<OidcClientMetadata & OidcClientRegistrationResponse>> => from(getWebID(clientId)).pipe(
    switchMap((response) => response.headers.get('content-type') !== 'text/turtle'
      ? throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`))
      : from(response.text())),
    map((text) => parseQuads(text)),
    switchMap((quads) => getOidcRegistrationTriple(quads)),
    switchMap((clientData) => compareClientDataWithRequest(clientData, contextRequestUrlSearchParams)),
  );

}
