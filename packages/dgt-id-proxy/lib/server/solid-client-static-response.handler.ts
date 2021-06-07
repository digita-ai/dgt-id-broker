import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, from, throwError, Observable } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';

export class SolidClientStaticResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor(private store: KeyValueStore<string, URL>){

    super();

  }

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse>  {

    try{

      const locationUrl = new URL(response.headers.location);
      const state = locationUrl.searchParams.get('state') ?? '';

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

    return from(this.store.get(state)).pipe(
      switchMap((redirectURL) => redirectURL
        ? of(redirectURL)
        : throwError(new Error('No data was found in the store'))),
      tap((redirectURL) => {

        locationUrl.searchParams.forEach((key, value) => redirectURL.searchParams.set(key, value));
        response.headers.location = redirectURL.toString();

      }),
      mapTo(response),
    );

  }

}
