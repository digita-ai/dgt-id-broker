import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Handler } from '@digita-ai/handlersjs-core';

/**
 * A {Handler} that adds 'solid' to the audience claim of a JWT Access Token
 */
export class SolidAudienceHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Handles the response. If the response is a 200 response it adds
   * the string 'solid' to the audience claim of the Access Token.
   *
   * @param {HttpHandlerResponse} response
   */
  handle (response: HttpHandlerResponse) {
    if (!response) {
      return throwError(new Error('response cannot be null or undefined'));
    }

    if (response.status !== 200) {
      return of(response);
    }

    if (!response.body.access_token || !response.body.access_token.payload){
      return throwError(new Error('Response body must contain an access token with a payload in JSON format'));
    }

    if (response.body.access_token.payload.aud !== 'solid'){
      if (Array.isArray(response.body.access_token.payload.aud)) {
        if (!response.body.access_token.payload.aud.includes('solid')){
          response.body.access_token.payload.aud.push('solid');
        }
      } else {
        response.body.access_token.payload.aud = [ response.body.access_token.payload.aud, 'solid' ];
      }
    }

    return of(response);
  }

  /**
   * Returns true if the response is defined and contains an access_token with a payload. Otherwise, returns false.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse) {
    return response && response.body.access_token && response.body.access_token.payload
      ? of(true)
      : of(false);
  }
}
