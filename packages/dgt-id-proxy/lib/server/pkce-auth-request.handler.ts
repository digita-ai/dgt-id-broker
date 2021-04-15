import { of, Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';

export class PkceAuthRequestHandler extends HttpHandler {

  constructor(private httpHandler: HttpHandler,
    private inMemoryStore: InMemoryStore<string, { challenge: string; method: string }>){
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
    const urlSearchParams = new URLSearchParams(context.request.url.toString());
    const challenge = urlSearchParams.get('code_challenge');
    const method = urlSearchParams.get('code_challenge_method');

    try{
      if (!challenge) {
        throw new Error('A code challenge must be provided.');
      }

      if (!method) {
        throw new Error('A code challenge method must be provided');
      }
    } catch (error) {
      return of(
        {
          body: JSON.stringify({ error: 'invalid_request', error_description: error.message }),
          headers: { 'access-control-allow-origin': context.request.headers.origin },
          status: 400,
        },
      );
    }

    const challengeAndMethod = {
      challenge,
      method,
    };

    return this.httpHandler.handle(context)
      .pipe(
        switchMap((response: HttpHandlerResponse) => {
          const splitURL = response.headers.location
            .split('?');

          if (splitURL.length === 1) {
            return throwError(new Error('No code was received'));
          }

          const splitQuery = splitURL[1].split('=');
          const code = splitQuery[1];
          this.inMemoryStore.set(code, challengeAndMethod);

          return of(response);
        }),
      );
  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return context
      && context.request
      && context.request.url
      && context.request.url.searchParams.get('code_challenge')
      && context.request.url.searchParams.get('code_challenge_method')
      ? of(true)
      : of(false);
  }
}
