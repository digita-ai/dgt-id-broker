import { of, Observable, throwError } from 'rxjs';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { createErrorResponse } from '../util/error-response-factory';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';

/**
 * A { HttpHandler } that handles pkce requests to the authorization endpoint.
 */
export class PkceAuthRequestHandler extends HttpHandler {

  /**
   * Creates a { PkceAuthRequestHandler }.
   *
   * @param { HttpHandler } handler - the handler to which to pass the request.
   * @param { KeyValueStore<Code, ChallengeAndMethod> }  store - stores the challenge method and code challenge.
   */
  constructor(
    private handler: HttpHandler,
    private store: KeyValueStore<Code, ChallengeAndMethod>,
  ){

    super();

    if (!handler) { throw new Error('A HttpHandler must be provided'); }

    if (!store) { throw new Error('A store must be provided'); }

  }
  /**
   * Handles the given context. Takes the code challenge, challenge method, and, if present, the state from the request.
   * The store then saves the code challenge, challenge method with the state as the key.
   * The parameters code_challenge and challenge_method are then removed from the request so that it becomes a PKCE-less request.
   *
   * @param { HttpHandlerContext } context - The context containing the request.
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) { return throwError(() => new Error('Context cannot be null or undefined')); }

    if (!context.request) { return throwError(() => new Error('No request was included in the context')); }

    if (!context.request.url) { return throwError(() => new Error('No url was included in the request')); }

    const challenge = context.request.url.searchParams.get('code_challenge');
    const method = context.request.url.searchParams.get('code_challenge_method');
    const state = context.request.url.searchParams.get('state');

    if (!state) { return throwError(() => new Error('Request must contain a state. Add state handlers to the proxy.')); }

    if (!challenge) { return of(createErrorResponse('A code challenge must be provided.', 'invalid_request')); }

    if (!method) { return of(createErrorResponse('A code challenge method must be provided', 'invalid_request')); }

    this.store.set(state, { challenge, method });

    context.request.url.searchParams.delete('code_challenge');
    context.request.url.searchParams.delete('code_challenge_method');

    return this.handler.handle(context);

  }

  /**
   * Specifies that if the response is defined this handler can handle the response by checking if it contains the necessary information.
   *
   * @param { HttpHandlerResponse } response - The response to handle.
   * @returns Boolean stating if the handler can handle the response.
   */
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
