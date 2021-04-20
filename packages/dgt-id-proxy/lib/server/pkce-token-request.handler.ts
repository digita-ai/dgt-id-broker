import { createHash } from 'crypto';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, InternalServerError } from '@digita-ai/handlersjs-http';
import { from, of, Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { InMemoryStore } from '../storage/in-memory-store';
import { Code, ChallengeAndMethod } from './pkce-auth-request.handler';

export class PkceTokenRequestHandler extends HttpHandler {

  constructor(private httpHandler: HttpHandler,
    private inMemoryStore: InMemoryStore<Code, ChallengeAndMethod>){
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

    if (!context.request.body) {
      return throwError(new Error('No body was included in the request'));
    }

    const request = context.request;
    const body = request.body;

    try{
      if (body.code_verifier === undefined || body.code_verifier === null) {
        throw new Error('Code verifier is required.');
      }

      if (body.code_verifier.length < 43 || body.code_verifier.length > 128){
        throw new Error('Code verifier must be between 43 and 128 characters.');
      }

      if (body.auth_code === undefined || body.auth_code === null) {
        throw new Error('An authorization code is required.');
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

    return from(this.inMemoryStore.get(body.auth_code))
      .pipe(
        switchMap((codeChallengeAndMethod) => {

          try {
            if (codeChallengeAndMethod) {

              const challenge = this.generateCodeChallenge(body.code_verifier, codeChallengeAndMethod);

              if (challenge === codeChallengeAndMethod.challenge) {
                return this.httpHandler.handle(context);
              }
              throw new Error(JSON.stringify({ error: 'invalid_grant', error_description: 'Code challenges do not match.' }));

            }
          } catch (error) {
            return of(
              {
                body: error.message,
                headers: { 'access-control-allow-origin': context.request.headers.origin },
                status: 400,
              },
            );
          }

          return throwError(new InternalServerError());
        }),
      );
  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return context
      && context.request
      && context.request.url
      && context.request.body
      && context.request.body.code_verifier
      && context.request.body.auth_code
      ? of(true)
      : of(false);
  }

  base64URL(str: string) {
    return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  generateCodeChallenge (code_verifier: string,
    challengeAndMethod: { challenge: string; method: string }): string {
    let challengeNew = '';

    if (challengeAndMethod.method === 'S256') {
      const hash = createHash('sha256');

      hash.update(code_verifier);

      challengeNew = hash.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    } else if (challengeAndMethod.method === 'plain') {

      challengeNew = this.base64URL(code_verifier);

    } else {

      throw new Error(JSON.stringify({ error: 'invalid_grant', error_description: 'Transform algorithm not supported.' }));

    }

    return challengeNew;
  }

}
