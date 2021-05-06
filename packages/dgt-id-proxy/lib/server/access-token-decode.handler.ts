
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, throwError, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { verifyUpstreamJwk } from '../util/verify-upstream-jwk';

export class AccessTokenDecodeHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor (private upstreamUrl: string) {
    super();

    if (!upstreamUrl) {
      throw new Error('upstreamUrl must be defined');
    }
  }

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {
    if (!response) {
      return throwError(new Error('response cannot be null or undefined'));
    }

    if (response.status !== 200) {
      return of(response);
    }

    // decode the access token
    return this.decodeAccessToken(response.body).pipe(
      // create a response containing the decoded access token
      map((decodedToken) => this.createDecodedAccessTokenResponse(response, decodedToken)),
    );
  }

  private decodeAccessToken(responseBody: string) {
    const parsedBody = JSON.parse(responseBody);
    if (!parsedBody.access_token) {
      return throwError(new Error('the response body did not include an access token.'));
    }

    // split the access token into header, payload, and footer parts
    const accessTokenSplit = parsedBody.access_token.split('.');

    if (accessTokenSplit.length < 3) {
      return throwError(new Error('the access token is not a valid JWT'));
    }

    return verifyUpstreamJwk(parsedBody.access_token, this.upstreamUrl).pipe(
      map(({ protectedHeader, payload }) => ({ header: protectedHeader, payload })),
    );
  }

  private createDecodedAccessTokenResponse(
    response: HttpHandlerResponse,
    decodedAccessToken: { header: any; payload: any },
  ) {
    const parsedBody = JSON.parse(response.body);
    parsedBody.access_token = decodedAccessToken;
    return {
      body: parsedBody,
      headers: {},
      status: 200,
    };
  }

  canHandle(response: HttpHandlerResponse) {
    return response
      ? of(true)
      : of(false);
  }
}
