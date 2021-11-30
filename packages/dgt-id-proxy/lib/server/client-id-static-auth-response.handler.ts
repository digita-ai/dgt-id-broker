import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, from, throwError, Observable } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';

/**
 * A {Handler<HttpHandlerResponse, HttpHandlerResponse>} that takes a key-value store.
 * It will redirect to the redirect URI and set the same query parameters as the once given in the response.
 */
export class ClientIdStaticAuthResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Creates a { ClientIdStaticAuthResponseHandler }.
   *
   * @param { KeyValueStore<string, URL> } keyValueStore - the keyValueStore in which to save client sent redirect uris
   */
  constructor(private keyValueStore: KeyValueStore<string, URL>){

    super();

    if (!keyValueStore) { throw new Error('No keyValueStore was provided'); }

  }

  /**
   * Handles the response. Clears the body of the response and checks it contains a state, if so retrieves the redirect uri from the keyValueStore
   * using that state. It then transfer each query parameter from the response location to the redirect uri and redirects.
   *
   * @param { HttpHandlerResponse } response - The incoming response to handle.
   */

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse>  {

    if (!response) { return throwError(() => new Error('No response was provided')); }

    try {

      const locationUrl = new URL(response.headers.location);
      const state = locationUrl.searchParams.get('state');

      if (!state) { return throwError(() => new Error('No state was found on the response. Cannot handle the response.')); }

      response.body = '';

      return from(this.keyValueStore.get(state)).pipe(
        switchMap((redirectURL) => redirectURL
          ? of(redirectURL)
          : throwError(() => new Error(`Response containing state '${state}' does not have a matching request`))),
        tap((redirectURL) => {

          locationUrl.searchParams.forEach((value, key) => redirectURL.searchParams.set(key, value));
          response.headers.location = redirectURL.toString();

        }),
        mapTo(response),
      );

    } catch (error) {

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

    return response
      ? of(true)
      : of(false);

  }

}
