import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of,  from, Observable, throwError } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { Handler } from '@digita-ai/handlersjs-core';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';

/**
 * A { HttpHandler } that handles pkce requests to the authorization endpoint that receives the authorization code
 * in a response from the upstream server.
 */
export class PkceCodeResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  private logger = getLoggerFor(this, 2, 2);

  /**
   * Creates a { PkceCodeRequestHandler }.
   *
   * @param {KeyValueStore<Code, ChallengeAndMethod>} store - Stores the challenge method, code challenge, and wether or not the user sent state.
   */
  constructor(
    private store: KeyValueStore<Code, ChallengeAndMethod>,
  ){

    super();

    if (!store) {

      throw new Error('A store must be provided');

    }

  }

  /**
   * Handles the response by checking if it contains a code and state parameter.
   * If it does, the state is used to find the code challenge and method in the store
   * that were used to request the authorization code. The authorization code then replaces the state as the key in the
   * { KeyValueStore }, so it can later be found when a request is made for a token.
   *
   * @param { HttpHandlerResponse } response - The response to handle.
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) {

      this.logger.verbose('No response received', response);

      return throwError(() => new Error('Context cannot be null or undefined'));

    }

    return of(response).pipe(
      switchMap((resp) => {

        try{

          const url = new URL(resp.headers.location);
          const state = url.searchParams.get('state') ?? '';
          const code = url.searchParams.get('code');

          return code ? this.handleCodeResponse(resp, state, code, url) : of(resp);

        } catch (error) {

          this.logger.debug('Error handling code response', error);

          return of(resp);

        }

      }),
    );

  }

  /**
   * Specifies that if the response is defined this handler can handle the response by checking if it contains the necessary information.
   *
   * @param { HttpHandlerResponse } response - The response to handle.
   * @returns Boolean stating if the handler can handle the response.
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    this.logger.info('Checking canHandle', response);

    return response
      ? of(true)
      : of(false);

  }

  /**
   * Sets location header to the URL provided and clears the response body.
   * Checks the store using the provided state and if found, replaces the state with the code as key.
   *
   * @param { HttpHandlerResponse } response - The response to edit.
   * @param { string } state - The state of the request.
   * @param { string } code - The authorization code.
   * @param { URL } url - The URL to set as location header.
   * @returns The response containing a new location header and empty body.
   */
  private handleCodeResponse(
    response: HttpHandlerResponse,
    state: string,
    code: string,
    url: URL,
  ): Observable<HttpHandlerResponse> {

    response.headers.location = url.toString();
    response.body = '';

    return from(this.store.get(state)).pipe(
      switchMap((challengeAndMethod) => {

        if (challengeAndMethod) return of(challengeAndMethod);

        this.logger.info('No challenge and method found in the keyValueStore for state: ', state);

        return throwError(() => new Error('No data was found in the store'));

      }),
      tap((challengeAndMethod) => {

        this.logger.warn('Deleting state from store', state);
        this.store.delete(state);
        this.logger.warn('Saving code with challenge and method in store', { code, challengeAndMethod });
        this.store.set(code, challengeAndMethod);

      }),
      mapTo(response),
    );

  }

}
