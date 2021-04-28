
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { of, throwError, zip } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { decode } from 'jose/util/base64url';

export class AccessTokenDecodeHandler extends HttpHandler {

  constructor(private handler: HttpHandler) {
    super();

    if (!handler) {
      throw new Error('A handler must be provided');
    }
  }

  handle(context: HttpHandlerContext) {
    if (!context) {
      return throwError(new Error('Context cannot be null or undefined'));
    }

    if (!context.request) {
      return throwError(new Error('No request was included in the context'));
    }

    if (!context.request.method) {
      return throwError(new Error('No method was included in the request'));
    }

    if (!context.request.headers) {
      return throwError(new Error('No headers were included in the request'));
    }

    if (!context.request.url) {
      return throwError(new Error('No url was included in the request'));
    }

    if (context.request.method === 'OPTIONS') {
      return this.handler.handle(context);
    }

    if (context.request.method !== 'POST') {
      return throwError(new MethodNotAllowedHttpError('this method is not supported.'));
    }

    return this.getUpstreamResponse(context).pipe(
      // decode the access token
      switchMap((response) => zip(of(response), this.decodeAccessToken(response.body))),
      // create a response containing the decoded access token
      switchMap(([ response, decodedToken ]) => this.createDecodedAccessTokenResponse(response, decodedToken)),
      // switches any errors with body into responses; all the rest are server errors which will hopefully be caught higher
      catchError((error) => error.body && error.headers && error.status ? of(error) : throwError(error)),
    );
  }

  private getUpstreamResponse = (context: HttpHandlerContext) => this.handler.handle(context).pipe(
    switchMap((response) => response.status === 200 ? of(response) : throwError(response)),
  );

  private decodeAccessToken(responseBody: string) {
    const parsedBody = JSON.parse(responseBody);
    // split the access token into header, payload, and footer parts
    const accessTokenSplit = parsedBody.access_token.split('.');

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

  canHandle(context: HttpHandlerContext) {
    return context
      && context.request
      && context.request.method
      && context.request.headers
      && context.request.url
      ? of(true)
      : of(false);
  }
}
