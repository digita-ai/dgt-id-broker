import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of } from 'rxjs';
import { KeyValueStore } from '../storage/key-value-store';

export class SolidClientStaticRegistrationHandler extends HttpHandler {

  constructor(
    private clientID: string,
    private store: KeyValueStore<string, string>,
    private httpHandler: HttpHandler,
  ) {
    super();

    if (!clientID) {
      throw new Error('No clientID was provided');
    }
    if (!store) {
      throw new Error('No store was provided');
    }
    if (!httpHandler) {
      throw new Error('No port was provided');
    }
  }

  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {
    if (!context) {
      return throwError(new Error('A context must be provided'));
    }

    return this.httpHandler.handle(context);
  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return context ? of(true) : of(false);
  }

}
