import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Handler } from '@digita-ai/handlersjs-core';

/**
 * A {Handler} that adds 'solid' to the audience claim of a JWT Access Token
 */
export class SolidAudienceRequestHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Handles the response. If the response is a 200 response it adds
   * the string 'solid' to the audience claim of the Access Token.
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse) {
    if (!response) {
      return throwError(new Error('response cannot be null or undefined'));
    }

    if (response.status !== 200) {
      return of(response);
    }

    if (!response.body.access_token || !response.body.access_token.payload){
      return throwError(new Error('Response body must contain an access token with a payload in JSON format'));
    }

    // creates a claim extended token
    return this.addAudienceClaimToToken(response.body.access_token).pipe(
      // creates a response including the new access token
      switchMap((token) => this.createAccessTokenResponse(response, token)),
    );
  }

  private addAudienceClaimToToken(token: { header: any; payload: any }): Observable<{ header: any; payload: any }> {
    // set the aud claim
    if (token.payload.aud !== 'solid'){
      if (Array.isArray(token.payload.aud)) {
        if (!token.payload.aud.includes('solid')){
          token.payload.aud.push('solid');
        }
      } else {
        token.payload.aud = [ token.payload.aud, 'solid' ];
      }
    }

    return of(token);
  }

  private createAccessTokenResponse(
    response: HttpHandlerResponse,
    claimExtendedAccessToken: { header: any; payload: any },
  ) {
    response.body.access_token = claimExtendedAccessToken;
    return of({
      body: response.body,
      headers: {},
      status: 200,
    });
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
