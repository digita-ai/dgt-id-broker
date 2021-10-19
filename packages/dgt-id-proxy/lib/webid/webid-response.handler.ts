import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { checkError, createErrorResponse } from '../public-api';
import { WebIdFactory } from './webid-factory';

/**
 * A {HttpHandler} that swaps the webid claim with the minted webid if the id token has no webid or
 * sets the webid in the access token as the same one provided in the id token.
 */
export class WebIdResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Creates a {WebIdResponseHandler}.
   *
   * @param {WebIdFactory} webIdFactory - a WebIdFactory implementation that receives a WebIdPattern and Claim parameters
   */
  constructor(private webIdFactory: WebIdFactory) {

    super();

    if (!webIdFactory) { throw new Error('A webIdFactory must be provided'); }

  }

  /**
   * Handles the response. Checks if the id token contains the custom claim provided to the constructor.
   * If not it returns an error. It checks if the id tokens payload contains a webid.
   * If the id token contains a webid it sets the web id in the access tokens payload to said webid.
   * If it does it calls the webid factory to create a minted webid and add it to the access and id token payloads.
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) { return throwError(new Error('A response must be provided')); }

    if (checkError(response)) {

      return of(createErrorResponse(
        checkError(response).error_description,
        checkError(response).error,
        response.headers
      ));

    }

    if (!response.body) { return throwError(new Error('The response did not contain a body')); }

    if (!response.body.access_token) { return throwError(new Error('The response body did not contain an access_token')); }

    if (!response.body.access_token.payload) { return throwError(new Error('The access_token did not contain a payload')); }

    if (!response.body.id_token) { return throwError(new Error('The response body did not contain an id_token')); }

    const access_token_payload = response.body.access_token.payload;
    const id_token_payload = response.body.id_token.payload;

    if (id_token_payload.webid) {

      access_token_payload.webid = id_token_payload.webid;

    } else {

      return this.webIdFactory.handle(id_token_payload).pipe(
        switchMap((minted_webid) => {

          access_token_payload.webid = minted_webid;
          id_token_payload.webid = minted_webid;

          return of(response);

        }),
      );

    }

    return of(response);

  }

  /**
   * Returns true if the response is defined. Otherwise it returns false.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response ? of(true) : of(false);

  }

}
