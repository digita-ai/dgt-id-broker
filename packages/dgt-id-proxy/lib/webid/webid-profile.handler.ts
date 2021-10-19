import { Handler } from '@digita-ai/handlersjs-core';
import { Observable, of, throwError, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { getClientRegistrationData } from '../util/process-client-registration-data';

export class WebIdProfileHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor() {

    super();

  }

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) { return throwError(new Error('A response must be provided')); }

    // this.getWebIdProfile(response.body.id_token.payload.webid);

    return of(response);

  }

  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response ? of(true) : of(false);

  }

  //   getWebIdProfile = async (webid: string): Promise<Response>  => {

  //     const data = await fetch(webid, {
  //       method: 'GET',
  //       headers: {
  //         Accept: 'application/ld+json',
  //       },
  //     });

  //     return data;

  //   };

}

