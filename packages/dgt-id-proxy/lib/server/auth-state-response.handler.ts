import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, from, throwError, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';

/**
 * A { Handler<HttpHandlerResponse, HttpHandlerResponse> } that handles the response from the upstream
 * Authorization Endpoint that contains a state.
 */
export class AuthStateResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  private logger = getLoggerFor(this, 5, 5);

  /**
   * creates an { AuthStateResponseHandler }
   *
   * @param { KeyValueStore<string, boolean> } keyValueStore - store with state as key and a boolean that is
   * true if the client sent the state originally, and false if it was generated by the proxy
   * @param { string } redirectUri - URI to redirect to after handling the response
   */
  constructor(private keyValueStore: KeyValueStore<string, boolean>, private redirectUri: string) {

    super();

    if (!keyValueStore) throw new Error('A keyValueStore must be provided');

    if (!redirectUri) throw new Error('A redirectUri must be provided');

  }

  /**
   * Handles the response by checking if the location header contains a valid URL. If it does,
   * it checks the state on the url, finds it in its store, and checks if the client sent the
   * state originally. If the client sent the state, the response is returned to the client as is.
   * If the client did not send the state the response is returned with the state removed from
   * the location header.
   * If the location header is not a valid URL (relative URL for example) the response is
   * returned unchanged.
   * If the state is not found in the location header, or the state is not found in the
   * keyValueStore an error is thrown
   *
   * @param {HttpHandlerResponse} response - The auth response to check.
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) {

      this.logger.verbose('No response was provided');

      return throwError(() => new Error('Response cannot be null or undefined'));

    }

    if(response.headers.location.startsWith(this.redirectUri)) {

      const url = new URL(response.headers.location);
      const state = url.searchParams.get('state') ?? '';

      this.logger.info('Checking state in store', state);

      return from(this.keyValueStore.get(state)).pipe(
        switchMap((clientSentState) => {

          if (clientSentState === undefined) {

            this.logger.verbose('State sent by client was not found in the keyValueStore', state);

            return throwError(() => new Error('Unknown state'));

          }

          if (!clientSentState) {

            this.logger.info('Client did not sent state, removing generated state from URL', state);

            url.searchParams.delete('state');
            response.headers.location = url.toString();

          }

          this.logger.info('Removing state from store', state);
          this.keyValueStore.delete(state);

          return of(response);

        })
      );

    } else {

      this.logger.verbose('Location header does not contain a valid redirect URI', response.headers.location);

      return of(response);

    }

  }

  /**
   * Specifies that if the response is defined this handler can handle the response.
   *
   * @param { HttpHandlerResponse } response - The auth response to handle.
   * @returns Boolean stating if the context can be handled or not.
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    this.logger.info('Checking canHandle', response);

    return response
      ? of(true)
      : of(false);

  }

}
