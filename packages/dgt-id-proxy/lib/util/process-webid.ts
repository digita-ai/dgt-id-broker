import { Observable, throwError, of } from 'rxjs';
import { OidcClientMetadata } from './oidc-client-metadata';

/**
 * Performs a get request to retrieve the webid turtle file
 *
 * @param { string } webID
 */
export const getWebID = (webID: string): Promise<Response> => fetch(webID, {
  method: 'GET',
  headers: {
    Accept: 'text/turtle, application/json',
  },
});

export const checkContext = (clientData: OidcClientMetadata): Observable<OidcClientMetadata> => !clientData['@context']
  ? throwError(new Error('WebID should use the normative JSON-LD @context'))
  : of(clientData);
