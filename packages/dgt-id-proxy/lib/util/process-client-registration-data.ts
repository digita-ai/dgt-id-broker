import { Observable, throwError, of, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ForbiddenHttpError } from '@digita-ai/handlersjs-http';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { getLogger } from '@digita-ai/handlersjs-logging';
import { OidcClientMetadata } from './oidc-client-metadata';
import { OidcClientRegistrationResponse } from './oidc-client-registration-response';

export type CombinedRegistrationData = OidcClientMetadata & OidcClientRegistrationResponse;
export type RegistrationStore = KeyValueStore<string, CombinedRegistrationData>;

const logger = getLogger();

/**
 * Performs a get request to retrieve the client registration file
 * checks if the content-type is ld+jsjon
 * and errors if the '@context' field is not present
 *
 * @param { string } client id
 */
export const getClientRegistrationData = async (clientid: string): Promise<CombinedRegistrationData> => {

  const data = await fetch(clientid, {
    method: 'GET',
    headers: {
      Accept: 'application/ld+json',
    },
  });

  if (!data) { logger.error(`Failed to fetch webid for client ${clientid}`); }

  if (data.headers.get('content-type') !== ('application/ld+json')) {

    logger.info(`Client registration data for ${clientid} is not a valid JSON-LD document`, data.headers.get('content-type'));

    throw new Error(`Incorrect content-type: expected application/ld+json but got ${data.headers.get('content-type')}`);

  }

  const dataJSON = await data.json();

  if (!dataJSON['@context']) {

    logger.warn('Data does not contain the normative JSON-LD @context', dataJSON);

    throw new Error('client registration data should use the normative JSON-LD @context');

  }

  return dataJSON;

};

/**
 * Compares the data from the ClientRegistrationData with the data given in the requests URLSearchParams.
 * It returns a 403 error when crucial parameters do not match
 *
 * @param { OidcClientMetadata } clientData
 * @param { URLSearchParams } searchParams
 */
export const compareClientRegistrationDataWithRequest = (
  clientData: CombinedRegistrationData,
  searchParams: URLSearchParams
): Observable<CombinedRegistrationData> => {

  if (clientData.client_id !== searchParams.get('client_id')) {

    logger.warn(`client_id does not match: ${clientData.client_id} !== ${searchParams.get('client_id')}`);

    return throwError(() => new ForbiddenHttpError('The client id in the request does not match the one in the client registration data'));

  }

  const redirect_uri = searchParams.get('redirect_uri');

  if (redirect_uri && !clientData.redirect_uris?.includes(redirect_uri)) {

    logger.warn(`redirect_uri ${redirect_uri} is not included in: ${clientData.redirect_uris}`);

    return throwError(() => new ForbiddenHttpError('The redirect_uri in the request is not included in the client registration data'));

  }

  const response_type = searchParams.get('response_type');

  if (response_type && !clientData.response_types?.includes(response_type))  {

    logger.warn(`response_type ${response_type} is not included in: ${clientData.response_types}`);

    return throwError(() => new ForbiddenHttpError('Response types do not match'));

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
): Observable<CombinedRegistrationData> =>
  from(getClientRegistrationData(clientId)).pipe(
    switchMap((clientData) => {

      logger.info(`Retrieved client data for clientId ${clientId}: `, clientData);

      return compareClientRegistrationDataWithRequest(
        clientData,
        contextRequestUrlSearchParams
      );

    })
  );

