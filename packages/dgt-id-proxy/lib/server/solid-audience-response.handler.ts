import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { Handler } from '@digita-ai/handlersjs-core';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';

/**
 * A { Handler<HttpHandlerResponse, HttpHandlerResponse> } that adds 'solid' to the audience claim of a JWT Access Token
 */
export class SolidAudienceResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  private logger = getLoggerFor(this, 2, 2);

  /**
   * Handles the response. If the response is a 200 response it adds
   * the string 'solid' to the audience claim of the Access Token.
   *
   * @param { HttpHandlerResponse } response - The response to handle containing the access token.
   */
  handle (response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) {

      this.logger.verbose('No response provided', response);

      return throwError(() => new Error('response cannot be null or undefined'));

    }

    if (response.status !== 200) {

      this.logger.warn('Response was not successful', response.status);

      return of(response);

    }

    if (!response.body.access_token || !response.body.access_token.payload){

      this.logger.verbose('No access_token or payload was found in the response', response.body);

      return throwError(() => new Error('Response body must contain an access token with a payload in JSON format'));

    }

    if (response.body.access_token.payload.aud === undefined || response.body.access_token.payload.aud === null) {

      response.body.access_token.payload.aud = 'solid';

    }

    if (response.body.access_token.payload.aud !== 'solid'){

      if (Array.isArray(response.body.access_token.payload.aud)) {

        if (!response.body.access_token.payload.aud.includes('solid')) {

          this.logger.info('The audience claim of the access token did not include "solid", adding solid now.', response.body.access_token.payload.aud);

          response.body.access_token.payload.aud.push('solid');

        }

      } else {

        this.logger.info('The audience claim of the access token did not include "solid", adding solid now.', response.body.access_token.payload.aud);

        response.body.access_token.payload.aud = [ response.body.access_token.payload.aud, 'solid' ];

      }

    }

    return of(response);

  }

  /**
   * Specifies that if the response is defined this handler can handle the response by checking if it contains the necessary information.
   *
   * @param { HttpHandlerResponse } response - The response to handle.
   * @returns Boolean stating if the handler can handle the response.
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    this.logger.info('Checking canHandle', response);

    return response && response.body.access_token && response.body.access_token.payload
      ? of(true)
      : of(false);

  }

}
