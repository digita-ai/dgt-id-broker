import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of,  from, Observable, throwError } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';
import { KeyValueStore } from './../storage/key-value-store';

/**
 * A {HttpHandler} that handles pkce requests to the authorization endpoint that receives the authorization code
 * in a response from the upstream server.
 */
export class PkceCodeRequestHandler extends HttpHandler {

  /**
   * Creates a {PkceCodeRequestHandler}
   *
   * @param {HttpHandler} httpHandler - the handler to which to pass the request.
   * @param {KeyValueStore<Code, ChallengeAndMethod>}  store - stores the challenge method, code challenge, and wether or not the user sent state.
   */
  constructor(
    private httpHandler: HttpHandler,
    private store: KeyValueStore<Code, ChallengeAndMethod>,
  ){

    super();

    if (!httpHandler) {

      throw new Error('A HttpHandler must be provided');

    }

    if (!store) {

      throw new Error('A store must be provided');

    }

  }

  /**
   * Handles the context by passing it to the nested handler. Then takes the response and checks if it contains
   * a code and state parameter. If it does, the state is used to find the code challenge and method in the store
   * that were used to request the authorization code. The authorization code then replaces the state as the key in the
   * {KeyValueStore}, so it can later be found when a request is made for a token.
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {

      return throwError(new Error('Context cannot be null or undefined'));

    }

    if (!context.request) {

      return throwError(new Error('No request was included in the context'));

    }

    if (!context.request.url) {

      return throwError(new Error('No url was included in the request'));

    }

    return this.httpHandler.handle(context).pipe(
      switchMap((response: HttpHandlerResponse) => {

        try{

          const url = new URL(response.headers.location);
          const state = url.searchParams.get('state') ?? '';
          const code = url.searchParams.get('code');

          return code ? this.handleCodeResponse(response, state, code, url) : of(response);

        } catch (error) {

          return of(response);

        }

      }),
    );

  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or url are not included.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
      && context.request
      && context.request.url
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
        : throwError(new Error('No data was found in the store'))),
      tap((challengeAndMethod) => {

        this.store.delete(state);
        this.store.set(code, challengeAndMethod);

      }),
      mapTo(response),
    );

  }

}
