import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of } from 'rxjs';

export class SolidClientDynamicRegistrationHandler extends HttpHandler {

  constructor(private context: HttpHandlerContext, private httpHandler: HttpHandler) {
    super();

    if (!context) {
      throw new Error('No host was provided');
    }
    if (!httpHandler) {
      throw new Error('No port was provided');
    }
  }

  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {
    if (!context) {
      return throwError(new Error('A context must be provided'));
    }

    if (!context.request) {
      return throwError(new Error('No request was included in the context'));
    }

    if (!context.request) {
      return throwError(new Error('No request was included in the context'));
    }

    if (!context.request.body) {
      return throwError(new Error('No body was included in the request'));
    }

    return this.httpHandler.handle(context);
  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return context ? of(true) : of(false);
  }

}
