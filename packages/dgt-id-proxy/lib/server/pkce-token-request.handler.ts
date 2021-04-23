import { createHash } from 'crypto';
import { HttpHandler, HttpHandlerContext, HttpHandlerRequest, HttpHandlerResponse, InternalServerError, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
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

    if (context.request.method === 'POST') {

      if (!context.request.body) {
        return throwError(new Error('No body was included in the request'));
      }

      const request = context.request;

      const params  = new URLSearchParams(request.body);
      const encodedCode_verifier = params.get('code_verifier');
      const code =  params.get('code');
      let code_verifier = '';

      if (encodedCode_verifier) {
        code_verifier = decodeURI(encodedCode_verifier);
      }

      try{
        if (!code_verifier) {
          throw new Error('Code verifier is required.');
        }

        if (code_verifier.length < 43 || code_verifier.length > 128){
          throw new Error('Code verifier must be between 43 and 128 characters.');
        }

        if (!code) {
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

      // console.log('token pkce1 ---- ', context.request);
      params.delete('code_verifier');
      // request.body = params.toString(); als je deze uit comment dan blijft de request pending
      // zo niet dan is krijg je invalid_grant als response

      return from(this.inMemoryStore.get(code))
        .pipe(
          switchMap((codeChallengeAndMethod) => {
            try {
              if (codeChallengeAndMethod) {

                const challenge = this.generateCodeChallenge(code_verifier, codeChallengeAndMethod);

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
    } else if (context.request.method === 'OPTIONS') {

      return this.httpHandler.handle(context);

    } else {

      return throwError(new MethodNotAllowedHttpError(`${context.request.method} requests are not allowed on token endpoint`));

    }

  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {
    const params  = new URLSearchParams(context.request.body);
    return context
      && context.request
      && context.request.url
      && context.request.body
      && params.get('code_verifier')
      && params.get('code')
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
