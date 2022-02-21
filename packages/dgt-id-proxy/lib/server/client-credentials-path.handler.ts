import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';

export class ClientCredentialsPathHandler extends HttpHandler {

  /**
   * Creates a { ClientCredentialsPathHandler }.
   *
   * @param {HttpHandler} httpHandler - the handler through which to pass requests
   */
  constructor(private httpHandler: HttpHandler) {

    super();

    if (!httpHandler) { throw new Error('A HttpHandler must be provided'); }

  }

  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) { return throwError(() => new Error('A context must be provided')); }

    if (!context.request) { return throwError(() => new Error('No request was included in the context')); }

    if (!context.request.body) { return throwError(() => new Error('No body was included in the request')); }

    // const params  = new URLSearchParams(context.request.body);

    return this.httpHandler.handle(context);

  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
    && context.request
    && context.request.body
      ? of(true)
      : of(false);

  }

}
