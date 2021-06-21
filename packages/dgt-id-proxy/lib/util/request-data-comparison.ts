import { ForbiddenHttpError } from '@digita-ai/handlersjs-http';
import {  throwError, of, Observable } from 'rxjs';
import { OidcClientMetadata } from './oidc-client-metadata';

/**
 * Compares the data from the webid with the data given in the requests URLSearchParams.
 * It returns a 403 error when crucial parameters do not match
 *
 * @param { Partial<OidcClientMetadata> } clientData
 * @param { URLSearchParams } searchParams
 */
export const compareClientDataWithRequest = (
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
