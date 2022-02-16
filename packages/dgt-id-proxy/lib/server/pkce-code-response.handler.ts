import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of,  from, Observable, throwError } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { Handler } from '@digita-ai/handlersjs-core';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';
import { KeyValueStore } from '../storage/key-value-store';

/**
 * A {HttpHandler} that handles pkce requests to the authorization endpoint that receives the authorization code
 * in a response from the upstream server.
 */
export class PkceCodeResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Creates a {PkceCodeRequestHandler}
   *
   * @param {KeyValueStore<Code, ChallengeAndMethod>}  store - stores the challenge method, code challenge, and wether or not the user sent state.
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
   * {KeyValueStore}, so it can later be found when a request is made for a token.
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) {

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

          return of(resp);

        }

      }),
    );

  }

  /**
   * Returns true if the response is valid.
   * Returns false if the response is undefined or null.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response
      ? of(true)
      : of(false);

  }

  private handleCodeResponse(
    response: HttpHandlerResponse,
    state: string,
    code: string,
    url: URL,
  ): Observable<HttpHandlerResponse> {

    response.headers.location = url.toString();
    response.body = '';

    return from(this.store.get(state)).pipe(
      switchMap((challengeAndMethod) => challengeAndMethod
        ? of(challengeAndMethod)
        : throwError(() => new Error('No data was found in the store'))),
      tap((challengeAndMethod) => {

        this.store.delete(state);
        this.store.set(code, challengeAndMethod);

      }),
      mapTo(response),
    );

  }

}
