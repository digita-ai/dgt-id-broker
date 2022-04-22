import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, throwError, Observable } from 'rxjs';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';

export class RedirectUriConditionHandler extends Handler<HttpHandlerResponse, boolean> {

  private logger = getLoggerFor(this, 5, 5);

  constructor(public redirectUri: string) {

    super();

  }

  handle(response: HttpHandlerResponse): Observable<boolean> {

    if (!response) {

      this.logger.verbose('No response was provided');

      return throwError(() => new Error('Response cannot be null or undefined'));

    }

    if (!response.headers) {

      this.logger.verbose('No response headers were provided');

      return throwError(() => new Error('Response did not contain any headers'));

    }

    return of(!!response.headers.location && response.headers.location.startsWith(this.redirectUri));

  }

  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    this.logger.info('Checking canHandle', response);

    return of(true);

  }

}
