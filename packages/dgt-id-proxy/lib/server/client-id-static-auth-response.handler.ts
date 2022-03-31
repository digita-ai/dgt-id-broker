import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, from, throwError, Observable } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';

export class ClientIdStaticAuthResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  private logger = getLoggerFor(this, 5, 5);

  constructor(private keyValueStore: KeyValueStore<string, URL>){

    super();

    if (!keyValueStore) { throw new Error('No keyValueStore was provided'); }

  }

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse>  {

    if (!response) {

      this.logger.verbose('No response was provided', response);

      return throwError(() => new Error('No response was provided'));

    }

    try {

      const locationUrl = new URL(response.headers.location);
      const state = locationUrl.searchParams.get('state');

      if (!state) {

        this.logger.verbose('No state was provided in the response', response.headers.location);

        return throwError(() => new Error('No state was found on the response. Cannot handle the response.'));

      }

      response.body = '';

      return from(this.keyValueStore.get(state)).pipe(
        switchMap((redirectURL) => {

          if (redirectURL) return of(redirectURL);

          this.logger.warn(`No redirect URI found for state ${state} in keyValueStore`, redirectURL);

          return throwError(() => new Error(`Response containing state '${state}' does not have a matching request`));

        }),
        tap((redirectURL) => {

          locationUrl.searchParams.forEach((value, key) => redirectURL.searchParams.set(key, value));
          response.headers.location = redirectURL.toString();

          this.logger.info('Replaced the redirect uri in the response', response);

        }),
        mapTo(response),
      );

    } catch (error) {

      this.logger.debug('Error occurred while handling the response', error);

      return of(response);

    }

  }

  /**
   * Specifies that if the response is defined this handler can handle the response.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    this.logger.info('Checking canHandle', response);

    return response
      ? of(true)
      : of(false);

  }

}
