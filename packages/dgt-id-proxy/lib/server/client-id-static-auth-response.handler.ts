import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, from, throwError, Observable } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';

/**
 * A {Handler<HttpHandlerResponse, HttpHandlerResponse>} that takes a key-value store.
 * It will redirect to the redirect URI and set the same query parameters as the once given in the response.
 */
export class ClientIdStaticAuthResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  private logger = getLoggerFor(this, 5, 5);

  /**
   * Creates a { ClientIdStaticAuthResponseHandler }.
   *
   * @param { KeyValueStore<string, URL> } keyValueStore - the keyValueStore in which to save client sent redirect uris
   */
  constructor(private keyValueStore: KeyValueStore<string, URL>, private redirectUri: string) {

    super();

    if (!keyValueStore) throw new Error('No keyValueStore was provided');

    if (!redirectUri) throw new Error('No redirectUri was provided');

  }

  /**
   * Handles the response. Clears the body of the response and checks it contains a state, if so retrieves the redirect uri from the keyValueStore
   * using that state. It then transfer each query parameter from the response location to the redirect uri and redirects.
   *
   * @param { HttpHandlerResponse } response - The incoming response to handle.
   */

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

      if(locationUrl.href.startsWith(this.redirectUri)) {

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

      } else {

        this.logger.verbose('Location header does not contain a valid redirect URI', response.headers.location);

        return of(response);

      }

    } catch (error) {

      this.logger.debug('Error occurred while handling the response', error);

      return of(response);

    }

  }

  /**
   * Specifies that if the response is defined this handler can handle the response.
   *
   * @param { HttpHandlerResponse } response - The incoming response to handle.
   * @returns Boolean stating if the context can be handled or not.
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    this.logger.info('Checking canHandle', response);

    return response
      ? of(true)
      : of(false);

  }

}
