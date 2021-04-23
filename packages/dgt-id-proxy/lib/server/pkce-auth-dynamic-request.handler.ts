import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, from, combineLatest, Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { InMemoryStore } from '../storage/in-memory-store';
import { Code, ChallengeAndMethod } from './pkce-auth-request.handler';

export class PkceAuthDynamicRequestHandler extends HttpHandler {

  constructor(
    private httpHandler: HttpHandler,
    private inMemoryStore: InMemoryStore<Code, ChallengeAndMethod>,
  ){
    super();

    if (!httpHandler) {
      throw new Error('A HttpHandler must be provided');
    }

    if (!inMemoryStore) {
      throw new Error('An InMemoryStore must be provided');
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
        if (response.headers.location && !response.headers.location.startsWith('/')){
          const url = new URL(response.headers.location);

          let state = url.searchParams.get('state');
          if (!state) {
            state = '';
          }

          return combineLatest(from(this.inMemoryStore.get(state)), of(response))
            .pipe(switchMap(([ challengeAndMethod, res ]) => {
              if (challengeAndMethod) {
                if (!challengeAndMethod.state) {

                  url.searchParams.delete('state');
                  res.headers.location = url.toString();
                  res.body = '';

                }
                const code = url.searchParams.get('code');
                if (state) {
                  this.inMemoryStore.delete(state);
                }

                if (code) {
                  this.inMemoryStore.set(code, challengeAndMethod);
                }

                return of(res);
              }
              return throwError(new Error('No data was found in the store'));
            }));
        }
        return of(response);
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

}
