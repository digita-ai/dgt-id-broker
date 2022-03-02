import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';

export class ClientCredentialsHandler extends HttpHandler {

  /**
   * Creates a { ClientCredentialsHandler }. 
   *
   * NOTE: This handler is Auth0 specific. It cannot currently be used with other OIDC providers.
   *
   * @param { HttpHandler } httpHandler - the handler through which to pass requests
   * @param { audience } audience - the auth0 audience to use for authentication
   */
  constructor(private httpHandler: HttpHandler, private audience: string) {

    super();

  }

  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) { return throwError(() => new Error('A context must be provided')); }

    if (!context.request) { return throwError(() => new Error('No request was included in the context')); }

    if (!context.request.url) { return throwError(() => new Error('No url was included in the request')); }

    context.request.url.href = context.request.url.href.replace('client', 'token');

    context.request.body = { ... context.request.body, audience: this.audience };

    return this.httpHandler.handle(context);

  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context && context.request && context.request.url ? of(true)
      : of(false);

  }

}
