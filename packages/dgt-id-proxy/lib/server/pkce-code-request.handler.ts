import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of,  from, Observable, throwError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { Code, ChallengeAndMethod } from '../util/models';
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
        if (response.headers.location && !response.headers.location.startsWith('/')){

          const url = new URL(response.headers.location);

          const state = url.searchParams.get('state') ?? '';

          url.searchParams.delete('state');
          response.headers.location = url.toString();
          response.body = '';

          return from(this.store.get(state))
            .pipe(
              switchMap((challengeAndMethod) => challengeAndMethod
                ? of(challengeAndMethod)
                : throwError(new Error('No data was found in the store'))),
              tap(() => this.store.delete(state)),
              switchMap((challengeAndMethod) => {

                const code = url.searchParams.get('code');

                if (code) {
                  this.store.set(code, challengeAndMethod);
                } else {
                  return throwError(new Error('No code was included in the response'));
                }
                return of(response);
              }),
            );
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
