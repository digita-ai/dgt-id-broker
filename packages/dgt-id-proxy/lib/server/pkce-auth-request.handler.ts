import { of, Observable, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { KeyValueStore } from '../storage/key-value-store';
import { PkceCodeRequestHandler } from './pkce-code-request.handler';

export type Code = string;
export interface ChallengeAndMethod { challenge: string; method: string; state?: string }
export class PkceAuthRequestHandler extends HttpHandler {

  constructor(
    private codeHandler: PkceCodeRequestHandler,
    private store: KeyValueStore<Code, ChallengeAndMethod>,
  ){
    super();

    if (!codeHandler) {
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

    const challenge = context.request.url.searchParams.get('code_challenge');

    const method = context.request.url.searchParams.get('code_challenge_method');
    let state = context.request.url.searchParams.get('state');

    try{
      if (!challenge) {
        throw new Error('A code challenge must be provided.');
      }

      if (!method) {
        throw new Error('A code challenge method must be provided');
      }

      if (!state) {
        state = uuidv4();
        context.request.url.searchParams.append('state', state);
        this.store.set(state, {
          challenge,
          method,
        });
      } else {
        this.store.set(state, {
          challenge,
          method,
          state,
        });
      }

    } catch (error) {
      return of(
        {
          body: JSON.stringify({ error: 'invalid_request', error_description: error.message }),
          headers: { },
          status: 400,
        },
      );
    }

    context.request.url.searchParams.delete('code_challenge');
    context.request.url.searchParams.delete('code_challenge_method');

    return this.codeHandler.handle(context);
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
