import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { decode } from 'jose/util/base64url';
import { Observable, of, throwError } from 'rxjs';

export class WebIDResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor(private webIdPattern: string) {
    super();

    if (!webIdPattern) {
      throw new Error('A WebID pattern must be provided');
    }
  }

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) {
      return throwError(new Error('A response must be provided'));
    }

    if (!response.body) {
      return throwError(new Error('The response did not contain a body'));
    }

    if (!response.body.access_token) {
      return throwError(new Error('The response body did not contain an access_token'));
    }

    if (!response.body.access_token.payload) {
      return throwError(new Error('The access_token did not contain a payload'));
    }

    if (!response.body.id_token) {
      return throwError(new Error('The response body did not contain an id_token'));
    }

    if (!response.body.id_token.payload) {
      return throwError(new Error('The id_token did not contain a payload'));
    }

    // ofcourse these tokens won't arrive decoded but for testing I assumed they do.
    const access_token_payload = response.body.access_token.payload;
    // const id_token_payload = JSON.parse(decode(response.body.id_token.split('.')[1]).toString());
    const id_token_payload = response.body.id_token.payload;
    const webID = access_token_payload.webid;
    const sub = access_token_payload.sub;

    if (!sub) {
      return of(
        {
          body: JSON.stringify({ error: 'bad_request', error_description: 'No sub claim was included' }),
          headers: { },
          status: 400,
        },
      );
    }

    if (!webID) {
      if (id_token_payload.webid) {
        access_token_payload.webid = id_token_payload.webid;
      } else {
        access_token_payload.webid = this.webIdPattern.replace(new RegExp(':+[^/.]+'), sub);
      }
    }

    return of(response);
  }

  canHandle(response: HttpHandlerResponse): Observable<boolean> {
    return response ? of(true) : of(false);
  }

}
