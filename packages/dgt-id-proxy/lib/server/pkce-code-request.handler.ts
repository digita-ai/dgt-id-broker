import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of,  from, Observable, throwError } from 'rxjs';
import { switchMap, tap, mapTo } from 'rxjs/operators';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';
import { KeyValueStore } from './../storage/key-value-store';
export class PkceCodeRequestHandler extends HttpHandler {

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
          if (code) {
            return this.handleCodeResponse(response, state, code, url);
          } else {
            return of(response);
          }
        } catch (error) {
          return of(response);
        }
      }),
    );
  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return context
      && context.request
      && context.request.url
      ? of(true)
      : of(false);
  }

  private handleCodeResponse(response: HttpHandlerResponse,
    state: string,
    code: string,
    url: URL): Observable<HttpHandlerResponse> {
    url.searchParams.delete('state');
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
