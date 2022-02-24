import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { checkError, createErrorResponse } from '../public-api';
import { WebIdFactory } from './webid-factory';

/**
 * A {HttpHandler} that swaps the webid claim with the minted webid if the id token or access_token has no webid or
 * sets the webid in the access token as the same one provided in the id token.
 */
export class WebIdResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Creates a {WebIdResponseHandler}.
   *
   * @param {WebIdFactory} webIdFactory - a WebIdFactory implementation that receives a WebIdPattern and Claim parameters
   */
  constructor(private webIdFactory: WebIdFactory, public tokenType: string = 'id_token') {

    super();

    if (!webIdFactory) { throw new Error('A webIdFactory must be provided'); }

    if ((tokenType !== 'id_token') && (tokenType !== 'access_token')) { throw new Error('The tokenType must be either id_token or access_token'); }

  }

  /**
   * Handles the response. Checks if the response contains an access_token with payload.
   * Checks if tokenType is id_token and if so, copies its webid claim to the access_token payload.
   * If no such claim is present a webid is minted.
   * If tokenType is id_token and does not contain a webid, a webid is minted by calling the webid factory.
   * If the access_token does not contain a webid claim one is minted as well.
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) { return throwError(() => new Error('A response must be provided')); }

    if (checkError(response)) {

      return of(createErrorResponse(
        checkError(response).error_description,
        checkError(response).error,
        response.headers
      ));

    }

    if (!response.body) { return throwError(() => new Error('The response did not contain a body')); }

    if (!response.body.access_token) { return throwError(() => new Error('The response body did not contain an access_token')); }

    if (!response.body.access_token.payload) { return throwError(() => new Error('The access_token did not contain a payload')); }

    const access_token_payload = response.body.access_token.payload;

    if (this.tokenType === 'id_token') {

      if (!response.body.id_token) { return throwError(() => new Error('The response body did not contain an id_token')); }

      const id_token_payload = response.body.id_token.payload;

      if (id_token_payload.webid) {

        access_token_payload.webid = id_token_payload.webid;

        return of(response);

      } else {

        return this.sendToFactory(id_token_payload, response);

      }

    } else {

      return this.sendToFactory(access_token_payload, response);

    }

  }

  sendToFactory = (payload: any, response: HttpHandlerResponse): Observable<any> =>
    this.webIdFactory.handle(payload).pipe(
      switchMap((minted_webid) => {

        payload.webid = minted_webid;

        return of(response);

      }),
    );

  /**
   * Returns true if the response is defined. Otherwise it returns false.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response ? of(true) : of(false);

  }

}
