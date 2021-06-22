import { Handler } from '@digita-ai/handlersjs-core';
import { Observable,  throwError, of, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { ForbiddenHttpError, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { OidcClientMetadata } from '../util/oidc-client-metadata';
import { OidcClientRegistrationResponse } from '../util/oidc-client-registration-response';
import { parseQuads, parseOidcRegistrationStatement, getWebID } from '../util/process-webid';

export abstract class ClientIdAuthRequestHandler extends Handler<HttpHandlerContext, HttpHandlerContext> {

  retrieveAndValidateWebId = (
    clientId: string,
    contextRequestUrlSearchParams: URLSearchParams
  ): Observable<Partial<OidcClientMetadata & OidcClientRegistrationResponse>> => from(getWebID(clientId)).pipe(
    switchMap((response) => response.headers.get('content-type') !== 'text/turtle'
      ? throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`))
      : from(response.text())),
    map((text) => parseQuads(text)),
    switchMap((quads) => parseOidcRegistrationStatement(quads)),
    switchMap((clientData) => this.compareClientDataWithRequest(clientData, contextRequestUrlSearchParams)),
  );

  /**
   * Compares the data from the webid with the data given in the requests URLSearchParams.
   * It returns a 403 error when crucial parameters do not match
   *
   * @param { Partial<OidcClientMetadata> } clientData
   * @param { URLSearchParams } searchParams
   */
  compareClientDataWithRequest = (
    clientData: Partial<OidcClientMetadata>,
    searchParams: URLSearchParams
  ): Observable<Partial<OidcClientMetadata>> => {

    if (clientData.client_id !== searchParams.get('client_id')) {

      return throwError(new ForbiddenHttpError('The client id in the request does not match the one in the WebId'));

    }

    if (!clientData.redirect_uris.includes(searchParams.get('redirect_uri'))) {

      return throwError(new ForbiddenHttpError('The redirect_uri in the request is not included in the WebId'));

    }

    if (!clientData.response_types.includes(searchParams.get('response_type')))  {

      return throwError(new ForbiddenHttpError('Response types do not match'));

    }

    return of(clientData);

  };

}
