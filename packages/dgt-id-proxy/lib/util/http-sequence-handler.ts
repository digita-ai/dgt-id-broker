import { Handler, SequenceHandler } from '@digita-ai/handlersjs-core';
import { HttpHandlerContext, HttpHandlerResponse, HttpHandler } from '@digita-ai/handlersjs-http';
import { Observable } from 'rxjs';

export class HttpSequenceHandler<C extends HttpHandlerContext> extends HttpHandler<C> {

  private sequenceHandler: SequenceHandler<C, HttpHandlerResponse>;

  constructor(handlers: Handler[]) {

    super();
    this.sequenceHandler = new SequenceHandler(handlers);

  }

  handle(input: C): Observable<HttpHandlerResponse<any>> {

    return this.sequenceHandler.handle(input);

  }

}
