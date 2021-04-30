
import { HttpHandlerContext, HttpHandlerResponse, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, throwError, zip, Observable } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { decode } from 'jose/util/base64url';

export class AccessTokenDecodeHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor() {
    super();
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
      switchMap((decodedToken) => this.createDecodedAccessTokenResponse(response, decodedToken)),
    );
  }

  private decodeAccessToken(responseBody: string) {
    const parsedBody = JSON.parse(responseBody);
    if (!parsedBody.access_token) {
      return throwError(new Error('the response body did not include an access token.'));
    }

    // split the access token into header, payload, and footer parts
    const accessTokenSplit = parsedBody.access_token.split('.');

    if (accessTokenSplit.length === 1) {
      return throwError(new Error('the access token is not a valid JWT'));
    }

    // create a decoded access token with a JSON header and payload.
    const decodedAccessToken = {
      header: JSON.parse(decode(accessTokenSplit[0]).toString()),
      payload: JSON.parse(decode(accessTokenSplit[1]).toString()),
    };

    return of(decodedAccessToken);
  }

  private createDecodedAccessTokenResponse(
    response: HttpHandlerResponse,
    decodedAccessToken: { header: any; payload: any },
  ) {
    const parsedBody = JSON.parse(response.body);
    parsedBody.access_token = decodedAccessToken;
    return of({
      body: parsedBody,
      headers: {},
      status: 200,
    });
  }

  canHandle(response: HttpHandlerResponse) {
    return response
      ? of(true)
      : of(false);
  }
}
