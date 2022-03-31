import { createHash } from 'crypto';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, InternalServerError } from '@digita-ai/handlersjs-http';
import { from, of, Observable, throwError, zip } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';
import { createErrorResponse } from '../util/error-response-factory';
import { recalculateContentLength } from '../util/recalculate-content-length';

/**
 * A { HttpHandler } that handles pkce requests to the token endpoint. It checks that the code verifier that is sent
 * in a request matches the code challenge of the authorization code in a {KeyValueStore}.
 */
export class PkceTokenHandler extends HttpHandler {

  private logger = getLoggerFor(this, 5, 5);

  /**
   * Creates a { PkceTokenHandler }
   *
   * @param { HttpHandler } httpHandler - the handler through which to pass requests
   * @param { KeyValueStore<Code, ChallengeAndMethod> } store - the store that contains the code challenge and challenge method used for each code
   */
  constructor(
    private httpHandler: HttpHandler,
    private store: KeyValueStore<Code, ChallengeAndMethod>
  ) {

    super();

    if (!httpHandler) { throw new Error('A HttpHandler must be provided'); }

    if (!store) { throw new Error('A store must be provided'); }

  }

  /**
   * Handles the context. Checks that the request contains a code verifier. If it does,
   * it checks that the request contains an authorization code. The authorization code is then
   * used to retrieve the challenge method and code challenge with which the authorization code was
   * first granted. The server then encodes the code verifier and checks that it matches the
   * code challenge in the store. If they match, the code verifier is removed from the request to
   * create a PKCE-less request and the request is passed on to the handler.
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {

      this.logger.verbose('No context was provided', context);

      return throwError(() => new Error('Context cannot be null or undefined'));

    }

    if (!context.request) {

      this.logger.verbose('No request was provided', context);

      return throwError(() => new Error('No request was included in the context'));

    }

    if (!context.request.body) {

      this.logger.verbose('No request body was provided', context.request);

      return throwError(() => new Error('No body was included in the request'));

    }

    const request = context.request;

    const params  = new URLSearchParams(request.body);

    if (params.get('grant_type') === 'refresh_token') {

      return this.httpHandler.handle(context);

    }

    const encodedCode_verifier = params.get('code_verifier');

    if (!encodedCode_verifier) {

      this.logger.warn('No code verifier was provided', params);

      return of(createErrorResponse('Code verifier is required.', 'invalid_request'));

    }

    const code =  params.get('code');

    if (!code) {

      this.logger.warn('No code was provided', params);

      return of(createErrorResponse('An authorization code is required.', 'invalid_request'));

    }

    const code_verifier = decodeURI(encodedCode_verifier);

    if (code_verifier.length < 43 || code_verifier.length > 128) {

      this.logger.warn('Code verifier is not of the correct length', code_verifier.length);

      return of(createErrorResponse('Code verifier must be between 43 and 128 characters.', 'invalid_request'));

    }

    this.logger.info('Deleting code verifier from URL');
    params.delete('code_verifier');
    request.body = params.toString();

    request.headers['content-length'] = recalculateContentLength(request);

    return from(this.store.get(code))
      .pipe(
        switchMap((codeChallengeAndMethod) => {

          if (codeChallengeAndMethod) {

            return zip(
              of(codeChallengeAndMethod),
              this.generateCodeChallenge(code_verifier, codeChallengeAndMethod.method)
            );

          }

          this.logger.warn('No code challenge and method was found for the code', code);

          return throwError(() => new InternalServerError('No stored challenge and method found.'));

        }),
        switchMap(([ codeChallengeAndMethod, challenge ]) => challenge === codeChallengeAndMethod.challenge
          ? this.httpHandler.handle(context)
          : of(createErrorResponse('Code challenges do not match.', 'invalid_grant'))),
        catchError((error) => error?.status && error?.headers ? of(error) : throwError(() => error)),
      );

  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or request body are not included.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    const params = context && context.request && context.request.body
      ? new URLSearchParams(context.request.body)
      : undefined;

    this.logger.info('Checking canHandle', { context, params });

    return context
      && context.request
      && context.request.url
      && context.request.body
      && params?.get('code_verifier')
      && params?.get('code')
      ? of(true)
      : of(false);

  }

  /**
   * Generates a code challenge from a code_verifier based on the method that is passed.
   * This is used to verify the code verifier matches the code challenge.
   *
   * @param {string} code_verifier
   * @param {string} method - the challenge method
   */
  generateCodeChallenge (code_verifier: string, method: string): Observable<string> {

    if (method !== 'S256' && method !== 'plain') {

      this.logger.info('Algorithm not supported', method);

      return throwError(() => createErrorResponse('Transform algorithm not supported.', 'invalid_request'));

    }

    switch (method) {

      case 'S256': {

        this.logger.info('Generating code challenge with algorithm: ', method);

        const hash = createHash('sha256');
        hash.update(code_verifier);

        return of(
          hash.digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_'),
        );

      }

      case 'plain':

        this.logger.info('Generating code challenge with algorithm: ', method);

        return of(code_verifier);

    }

  }

}
