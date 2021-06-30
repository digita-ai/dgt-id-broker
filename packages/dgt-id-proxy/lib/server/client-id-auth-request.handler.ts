import { Handler } from '@digita-ai/handlersjs-core';
import { Observable, throwError, of, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ForbiddenHttpError, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { OidcClientMetadata } from '../util/oidc-client-metadata';
import { OidcClientRegistrationResponse } from '../util/oidc-client-registration-response';
import { getClientRegistrationData } from '../util/process-clientregistrationdata';

/**
 * A { Handler<HttpHandlerContext, HttpHandlerContext> } abstract class that
 * contains two important functions:
 * 1. A  retrieveAndValidateValidateClientRegistrationData function
 * 2. A compareClientRegistrationDataWithRequest function that
 */
export abstract class ClientIdAuthRequestHandler extends Handler<HttpHandlerContext, HttpHandlerContext> {

  /**
   * A  retrieveAndValidateClientRegistrationData function that:
   * - retrieves the ClientRegistrationData,
   * - checks if the returned type is jsonld, and errors if not,
   * else it returns the ClientRegistrationData content
   * - checks if the jsonld context is present and returns a error if not
   * else it returns a JSON object
   * - calls compareClientDataWithRequest to compare the data and errors if not correct
   *
   * @param clientId
   * @param contextRequestUrlSearchParams
   */
  retrieveAndValidateClientRegistrationData = (
    clientId: string,
    contextRequestUrlSearchParams: URLSearchParams
  ): Observable<Partial<OidcClientMetadata & OidcClientRegistrationResponse>> =>
    from(getClientRegistrationData(clientId)).pipe(
      switchMap((clientData) => this.compareClientRegistrationDataWithRequest(
        clientData,
        contextRequestUrlSearchParams
      ))
    );

  /**
   * Compares the data from the ClientRegistrationData with the data given in the requests URLSearchParams.
   * It returns a 403 error when crucial parameters do not match
   *
   * @param { Partial<OidcClientMetadata> } clientData
   * @param { URLSearchParams } searchParams
   */
  compareClientRegistrationDataWithRequest = (
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

}
