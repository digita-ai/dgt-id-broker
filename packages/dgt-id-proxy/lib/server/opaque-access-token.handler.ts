import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { decode } from 'jose/util/base64url';
import { Handler } from '@digita-ai/handlersjs-core';

/**
 * A {HttpHandler} that handles Access Token responses for an upstream server that returns Opaque Access Tokens
 * by turning them into valid JSON Web Tokens
 */
export class OpaqueAccessTokenHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {
  /**
   * handles the response. The sub, aud, iat and exp claims from the id_token returned
   * by the upstream server are used to create a valid JWT Access Token.
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

    // creates a jwt access token from claims in the id token
    return this.createJwtAccessToken(response.body).pipe(
      // create a response to replace the opaque access token with the jwt acces token
      map((token) => this.createAccessTokenResponse(response, token)),
    );
  }

  private createJwtAccessToken(responseBody: string): Observable<{ header: any; payload: any }> {
    const parsedBody = JSON.parse(responseBody);
    // split the id token into header, payload, and footer parts, then get the payload
    const idTokenPayload = parsedBody.id_token.split('.')[1];
    // base64url decode the id token payload
    const decodedIdTokenPayload = JSON.parse(decode(idTokenPayload).toString());

    // get the sub and aud claims from the id token and add them to the accessTokenPayload
    const accessToken = {
      header: {},
      payload: {
        sub: decodedIdTokenPayload.sub,
        aud: decodedIdTokenPayload.aud,
        iat: decodedIdTokenPayload.iat,
        exp: decodedIdTokenPayload.exp,
      },
    };

    // sign the token
    return of(accessToken);
  }

  private createAccessTokenResponse(
    response: HttpHandlerResponse,
    jwtAccessToken: { header: any; payload: any },
  ) {
    const parsedBody = JSON.parse(response.body);
    parsedBody.access_token = jwtAccessToken;
    return {
      body: parsedBody,
      headers: {},
      status: 200,
    };
  }
  /**
   * Returns true if the response is defined. Otherwise, returns false.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse) {
    return response ? of(true) : of(false);
  }

}

