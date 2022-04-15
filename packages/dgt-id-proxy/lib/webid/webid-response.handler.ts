import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';
import { Observable, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { checkError, createErrorResponse } from '../public-api';
import { WebIdFactory } from './webid-factory';

/**
 * A {HttpHandler} that swaps the webid claim with the minted webid if the id token or access_token has no webid or
 * sets the webid in the access token as the same one provided in the id token.
 */
export class WebIdResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  private logger = getLoggerFor(this, 5, 5);

  /**
   * Creates a { WebIdResponseHandler }.
   *
   * @param { WebIdFactory } webIdFactory - a WebIdFactory implementation that receives a WebIdPattern and Claim parameters.
   */
  constructor(private webIdFactory: WebIdFactory, public tokenType: string = 'id_token') {

    super();

    if (!webIdFactory) { throw new Error('A webIdFactory must be provided'); }

    if ((tokenType !== 'id_token') && (tokenType !== 'access_token')) { throw new Error('The tokenType must be either id_token or access_token'); }

  }

  /**
   * Handles the response. Checks if the response contains an access_token with payload.
   * Checks if tokenType is id_token and if so, copies its webid claim to the access_token payload.
   * If tokenType is id_token and the id_token does not contain a webid, a webid is minted by calling the webid factory with the id_token payload.
   * If the tokenType is access_token a webid is minted by calling the webid factory with the access_token payload.
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) {

      this.logger.verbose('No response provided', response);

      return throwError(() => new Error('A response must be provided'));

    }

    if (checkError(response)) {

      this.logger.verbose('Response contains an error', response);

      return of(createErrorResponse(
        checkError(response).error_description,
        checkError(response).error,
        response.headers
      ));

    }

    if (!response.body) {

      this.logger.verbose('No body in response', response);

      return throwError(() => new Error('The response did not contain a body'));

    }

    if (!response.body.access_token) {

      this.logger.verbose('No access_token in response', response.body);

      return throwError(() => new Error('The response body did not contain an access_token'));

    }

    if (!response.body.access_token.payload) {

      this.logger.verbose('No payload in access_token', response.body.access_token);

      return throwError(() => new Error('The access_token did not contain a payload'));

    }

    const access_token_payload = response.body.access_token.payload;

    if (this.tokenType === 'id_token') {

      if (!response.body.id_token) {

        this.logger.verbose('No id_token in response', response.body);

        return throwError(() => new Error('The response body did not contain an id_token'));

      }

      const id_token_payload = response.body.id_token.payload;

      if (id_token_payload.webid) {

        this.logger.info('adding webid from id token to access token', id_token_payload.webid);

        access_token_payload.webid = id_token_payload.webid;

        return of(response);

      } else {

        this.logger.info('No webid in id token, minting webid', response.body.id_token);

        return this.webIdFactory.handle(id_token_payload).pipe(
          switchMap((minted_webid) => {

            access_token_payload.webid = minted_webid;
            id_token_payload.webid = minted_webid;

            return of(response);

          }),
        );

      }

    } else {

      this.logger.info('No webid in access token, minting webid', response.body.access_token);

      return this.webIdFactory.handle(access_token_payload).pipe(
        switchMap((minted_webid) => {

          access_token_payload.webid = minted_webid;

          return of(response);

        }),
      );

    }

  }

  /**
   * Specifies that if the response is defined this handler can handle the response.
   *
   * @param { HttpHandlerResponse } response - The response to handle.
   * @returns Boolean stating if the handler can handle the response.
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    this.logger.info('Checking canHandle', response);

    return response ? of(true) : of(false);

  }

}
