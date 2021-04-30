import { createHash } from 'crypto';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, InternalServerError, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { from, of, Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { Code, ChallengeAndMethod } from './pkce-auth-request.handler';

export class PkceTokenRequestHandler extends HttpHandler {

  constructor(private httpHandler: HttpHandler,
    private store: KeyValueStore<Code, ChallengeAndMethod>) {
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

      if (!code_verifier) {
        return this.throwErrorResponse('Code verifier is required.', context, 'invalid_request');
      }

      if (code_verifier.length < 43 || code_verifier.length > 128){
        return this.throwErrorResponse('Code verifier must be between 43 and 128 characters.', context, 'invalid_request');
      }

      if (!code) {
        return this.throwErrorResponse('An authorization code is required.', context, 'invalid_request');
      }

      params.delete('code_verifier');
      request.body = params.toString();

      const contentTypes = request.headers['content-type'];

      if (contentTypes) {
        let charset: BufferEncoding;
        let set  = '';

        if (contentTypes.includes('charset=') && contentTypes.includes(';')) {
          contentTypes.split(';')
            .map((type) => {
              if (type.includes('charset=')) {
                set = type.split('=')[1].toLowerCase();
              }
            });
        } else {
          set = 'utf-8';
        }

        if (set !== 'ascii' && set !== 'utf8' && set !== 'utf-8' && set !== 'utf16le' && set !== 'ucs2' && set !== 'ucs-2' && set !== 'base64' && set !== 'latin1' && set !== 'binary' && set !== 'hex') {
          return throwError(new Error('The specified charset is not supported'));
        } else {
          charset = set;
        }

        request.headers['content-length'] = Buffer.byteLength(request.body, charset).toString();
      }

      return from(this.store.get(code))
        .pipe(
          switchMap((codeChallengeAndMethod) => {

            if (codeChallengeAndMethod) {
              let challenge = '';
              try{
                challenge = this.generateCodeChallenge(code_verifier, codeChallengeAndMethod.method);
              } catch(error) {
                return this.throwErrorResponse(error.message, context, 'invalid_request');
              }

              if (challenge === codeChallengeAndMethod.challenge) {
                return this.httpHandler.handle(context);
              }
              return this.throwErrorResponse('Code challenges do not match.', context, 'invalid_grant');

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
    let params = new URLSearchParams();
    if (context && context.request && context.request.body) {
      params  = new URLSearchParams(context.request.body);
    }

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
    method: string) {
    let challengeNew = '';

    if (method === 'S256') {
      const hash = createHash('sha256');

      hash.update(code_verifier);

      challengeNew = hash.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    } else if (method === 'plain') {
      challengeNew = code_verifier;
    } else {
      throw new Error('Transform algorithm not supported.');
    }

    return challengeNew;
  }

  throwErrorResponse(msg: string, context: HttpHandlerContext, error: string): Observable<HttpHandlerResponse> {
    return of(
      {
        body: JSON.stringify({ error, error_description: msg }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      },
    );
  }

}
