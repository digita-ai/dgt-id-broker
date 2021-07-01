import { Observable, throwError, of, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ForbiddenHttpError } from '@digita-ai/handlersjs-http';
import { OidcClientMetadata } from './oidc-client-metadata';
import { OidcClientRegistrationResponse } from './oidc-client-registration-response';

/**
 * Performs a get request to retrieve the client registration file
 * checks if the content-type is ld+jsjon
 * and errors if the '@context' field is not present
 *
 * @param { string } client id
 */
export const getClientRegistrationData = async (clientid: string): Promise<Partial<OidcClientMetadata>> =>{

  const data = await fetch(clientid, {
    method: 'GET',
    headers: {
      Accept: 'application/ld+json',
    },
  });

  if (data.headers.get('content-type') !== ('application/ld+json')) {  throw new Error(`Incorrect content-type: expected application/ld+json but got ${data.headers.get('content-type')}`); }

  const dataJSON = await data.json();

  if (!dataJSON['@context']) { throw new Error('client registration data should use the normative JSON-LD @context'); }

  return dataJSON;

};

/**
 * Compares the data from the ClientRegistrationData with the data given in the requests URLSearchParams.
 * It returns a 403 error when crucial parameters do not match
 *
 * @param { Partial<OidcClientMetadata> } clientData
 * @param { URLSearchParams } searchParams
 */
export const compareClientRegistrationDataWithRequest = (
  clientData: Partial<OidcClientMetadata>,
  searchParams: URLSearchParams
): Observable<Partial<OidcClientMetadata>> => {

  if (clientData.client_id !== searchParams.get('client_id')) {

    return throwError(new ForbiddenHttpError('The client id in the request does not match the one in the client registration data'));

  }

  if (!clientData.redirect_uris.includes(searchParams.get('redirect_uri'))) {

    return throwError(new ForbiddenHttpError('The redirect_uri in the request is not included in the client registration data'));

  }

  if (!clientData.response_types.includes(searchParams.get('response_type')))  {

    return throwError(new ForbiddenHttpError('Response types do not match'));

  }

  return of(clientData);

};

/**
 * A  retrieveAndValidateClientRegistrationData function that:
 * - calls getClientRegistrationData
 * - calls compareClientRegistrationDataWithRequest to compare the data and errors if not correct
 *
 * @param clientId
 * @param contextRequestUrlSearchParams
 */
export const retrieveAndValidateClientRegistrationData = (
  clientId: string,
  contextRequestUrlSearchParams: URLSearchParams
): Observable<Partial<OidcClientMetadata & OidcClientRegistrationResponse>> =>
  from(getClientRegistrationData(clientId)).pipe(
    switchMap((clientData) => compareClientRegistrationDataWithRequest(
      clientData,
      contextRequestUrlSearchParams
    ))
  );

