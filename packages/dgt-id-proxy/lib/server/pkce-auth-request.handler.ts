import { of, Observable, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { KeyValueStore } from '../storage/key-value-store';
import { createErrorResponse, Code, ChallengeAndMethod } from '../util/models';
import { PkceCodeRequestHandler } from './pkce-code-request.handler';

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

    if (!challenge) {
      return createErrorResponse('A code challenge must be provided.', context, 'invalid_request');
    }

    if (!method) {
      return createErrorResponse('A code challenge method must be provided', context, 'invalid_request');
    }

    let generatedState = false;
    if (!state) {
      state = uuidv4();
      context.request.url.searchParams.append('state', state);
      generatedState = true;
    }

    this.setStore(state, challenge, method, generatedState);

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

  setStore(state: string, challenge: string, method: string, generatedState: boolean): void {
    generatedState ?
      this.store.set(state, {
        challenge,
        method,
      }) :
      this.store.set(state, {
        challenge,
        method,
        clientState: state,
      });
  }
}
