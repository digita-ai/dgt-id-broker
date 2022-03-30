import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of, throwError, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';

/**
 * A { Handler<HttpHandlerContext, HttpHandlerContext> } that handles requests to the Authorization Endpoint. Makes sure the request
 * contains a state parameter so that the original request can be linked to the redirect response
 * to the client's redirect_uri.
 */
export class AuthStateRequestHandler extends Handler<HttpHandlerContext, HttpHandlerContext> {

  private logger = getLoggerFor(this, 5, 5);

  /**
   * Creates an { AuthStateRequestHandler }
   *
   * @param {KeyValueStore<string, boolean>} keyValueStore - store with state as key and a boolean that is
   * true if the client sent the state originally, and false if it was generated by the proxy
   */
  constructor(private keyValueStore: KeyValueStore<string, boolean>) {

    super();

    if(!keyValueStore){

      throw new Error('A keyValueStore must be provided');

    }

  }

  /**
   * Handles the request by checking if the client sent state in it's request to the
   * Authorization Endpoint. If the client sent state, the state is saved in the
   * { KeyValueStore<string, boolean> } with the value `true` to indicate that the
   * client sent the state. Otherwise, a state is generated, added to the request url
   * and saved in the { KeyValueStore<string, boolean> } with the value `false` to indicate
   * the client did not send the state.
   *
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerContext> {

    if (!context) {

      this.logger.verbose('No context was provided', context);

      return throwError(() => new Error('Context cannot be null or undefined'));

    }

    if (!context.request) {

      this.logger.verbose('No request was provided', context.request);

      return throwError(() => new Error('No request was included in the context'));

    }

    if (!context.request.headers) {

      this.logger.verbose('No request headers were provided', context.request.headers);

      return throwError(() => new Error('No headers were included in the request'));

    }

    if (!context.request.url) {

      this.logger.verbose('No request url was provided', context.request.url);

      return throwError(() => new Error('No url was included in the request'));

    }

    const state = context.request.url.searchParams.get('state');

    const generatedState = state ? '' : uuidv4();

    if (generatedState) {

      this.logger.info('No state found, generating state');

      context.request.url.searchParams.append('state', generatedState);

    }

    this.logger.info('Saving state in store: ', state ?? generatedState);
    this.keyValueStore.set(state ?? generatedState, !!state);

    return of(context);

  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or the request's method, headers, or url are not included.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    this.logger.info('Checking canHandle', context);

    return context
      && context.request
      && context.request.headers
      && context.request.url
      ? of(true)
      : of(false);

  }

}
