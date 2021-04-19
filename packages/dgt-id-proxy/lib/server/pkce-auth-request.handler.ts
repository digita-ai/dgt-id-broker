import { of, Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, InternalServerError } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';

export type Code = string;
export interface ChallengeAndMethod { challenge: string; method: string }
export class PkceAuthRequestHandler extends HttpHandler {

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

    const challenge = context.request.url.searchParams.get('code_challenge');
    const method = context.request.url.searchParams.get('code_challenge_method');

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

    context.request.url.searchParams.delete('code_challenge');
    context.request.url.searchParams.delete('code_challenge_method');

    return this.httpHandler.handle(context).pipe(
      switchMap((response: HttpHandlerResponse) => {
        const splitURL = response.headers.location.split('?');

        if (splitURL.length === 1) {
          return throwError(new InternalServerError());
        }

        const splitQuery = splitURL[1].split('=');
        const authCode = splitQuery[1];

        this.inMemoryStore.set(authCode, {
          challenge,
          method,
        });

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
