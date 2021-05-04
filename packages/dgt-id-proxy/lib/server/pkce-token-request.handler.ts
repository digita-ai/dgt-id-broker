import { createHash } from 'crypto';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, InternalServerError, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { from, of, Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';
import { createErrorResponse } from '../util/error-response-factory';
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
      const code_verifier = encodedCode_verifier ? decodeURI(encodedCode_verifier) : undefined;

      if (!code_verifier) {
        return createErrorResponse('Code verifier is required.', context, 'invalid_request');
      }

      if (code_verifier.length < 43 || code_verifier.length > 128){
        return createErrorResponse('Code verifier must be between 43 and 128 characters.', context, 'invalid_request');
      }

      if (!code) {
        return createErrorResponse('An authorization code is required.', context, 'invalid_request');
      }

      params.delete('code_verifier');
      request.body = params.toString();

      const contentTypeHeader = request.headers['content-type'];

      if (contentTypeHeader) {
        let charset: BufferEncoding;

        const charsetString  = contentTypeHeader.split(';')
          .filter((part) => part.includes('charset='))
          .map((part) => part.split('=')[1].toLowerCase())
          ?? 'utf-8';

        if (charsetString !== 'ascii' && charsetString !== 'utf8' && charsetString !== 'utf-8' && charsetString !== 'utf16le' && charsetString !== 'ucs2' && charsetString !== 'ucs-2' && charsetString !== 'base64' && charsetString !== 'latin1' && charsetString !== 'binary' && charsetString !== 'hex') {
          return throwError(new Error('The specified charset is not supported'));
        } else {
          charset = charsetString;
        }

        request.headers['content-length'] = Buffer.byteLength(request.body, charset).toString();
      }

      return from(this.store.get(code))
        .pipe(
          switchMap((codeChallengeAndMethod) => codeChallengeAndMethod 
            ? this.generateCodeChallenge(code_verifier, codeChallengeAndMethod.method);
            : throwError(new InternalServerError('No stored challenge and method found.'))
          ),
          switchMap((challenge) => challenge === codeChallengeAndMethod.challenge 
            ? this.httpHandler.handle(context)
            : createErrorResponse('Code challenges do not match.', context, 'invalid_grant')
          ),
          catchError(error) => error?.status && error?.headers ? of(error) : throwError(error)),
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

  generateCodeChallenge (code_verifier: string, method: string): Observable<string> {
    
    if (method !== 'S256' && method !== 'plain') {
        return createErrorResponse('Transform algorithm not supported.', 'invalid_request');
    }

    switch (method) {

      case 'S256': {
          
        const hash = createHash('sha256');
        hash.update(code_verifier);

        return of(
          hash.digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
           .replace(/\//g, '_')
        );

      }

      case 'plain': return of(code_verifier);

    } 

  }

}
