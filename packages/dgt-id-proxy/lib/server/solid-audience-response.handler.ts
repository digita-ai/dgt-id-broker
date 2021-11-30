import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { Handler } from '@digita-ai/handlersjs-core';

/**
 * A { Handler<HttpHandlerResponse, HttpHandlerResponse> } that adds 'solid' to the audience claim of a JWT Access Token
 */
export class SolidAudienceResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Handles the response. If the response is a 200 response it adds
   * the string 'solid' to the audience claim of the Access Token.
   *
   * @param { HttpHandlerResponse } response - The response to handle containing the access token.
   */
  handle (response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) { return throwError(() => new Error('response cannot be null or undefined')); }

    if (response.status !== 200) { return of(response); }

    if (!response.body.access_token || !response.body.access_token.payload){

      return throwError(() => new Error('Response body must contain an access token with a payload in JSON format'));

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
   * Specifies that if the response is defined this handler can handle the response by checking if it contains the necessary information.
   *
   * @param { HttpHandlerResponse } response - The response to handle.
   * @returns Boolean stating if the handler can handle the response.
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response && response.body.access_token && response.body.access_token.payload
      ? of(true)
      : of(false);

  }

}
