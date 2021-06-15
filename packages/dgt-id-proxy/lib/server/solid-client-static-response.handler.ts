import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, from, throwError, Observable } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';

export class SolidClientStaticResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor(private keyValueStore: KeyValueStore<string, URL>){

    super();

    if (!keyValueStore) {

      throw new Error('No keyValueStore was provided');

    }

  }

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse>  {

    if (!response) {

      return throwError(new Error('No response was provided'));

    }

    try{

      const locationUrl = new URL(response.headers.location);
      const state = locationUrl.searchParams.get('state');

      if (!state) {

        return throwError(new Error('No state was found on the response. Cannot handle the response.'));

      }

      return this.handleResponse(response, state, locationUrl);

    } catch (error) {

      return of(response);

    }

  }

  /**
   * Specifies that if the response is defined this handler can handle the response.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response
      ? of(true)
      : of(false);

  }

  private handleResponse(
    response: HttpHandlerResponse,
    state: string,
    locationUrl: URL,
  ): Observable<HttpHandlerResponse> {

    response.body = '';

    return from(this.keyValueStore.get(state)).pipe(
      switchMap((redirectURL) => redirectURL
        ? of(redirectURL)
        : throwError(new Error(`Response containing state '${state}' does not have a matching request`))),
      tap((redirectURL) => {

        locationUrl.searchParams.forEach((value, key) => redirectURL.searchParams.set(key, value));
        response.headers.location = redirectURL.toString();

      }),
      mapTo(response),
    );

  }

}
