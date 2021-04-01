import { HttpHandler, HttpHandlerRequest, HttpHandlerResponse, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { Observable, of } from 'rxjs';
import { NodeHttpStreamsHandler } from './node-http-streams.handler';
import { NodeHttpStreams } from './node-http-streams.model';

/**
 * A class that extends NodeHttpStreamsHandler and receives a HttpHandler as
 * a dependency.
 *
 * @class
 */
export class NodeHttpRequestResponseHandler extends NodeHttpStreamsHandler {
  /**
   * @constructor
   * @param {HttpHandler} httpHandler
   */
  constructor(private httpHandler: HttpHandler){
    super();
  }

  /**
   * handle reads the requestStream of its NodeHttpStream and saves it as a HttpHandlerRequest.
   * It then creates a HttpHandlerContext using that request, passes it on to the
   * HttpHandler that was passed in as a dependency. Finally it writes the result to the
   * responseStream.
   *
   * @param {NodeHttpStreams} noteHttpStreams
   * @returns {Observable<void>}
   */
  handle(nodeHttpStreams: NodeHttpStreams): Observable<void> {
    const httpHandlerRequest: HttpHandlerRequest = nodeHttpStreams.requestStream.read();
    const httpHandlerContext: HttpHandlerContext = {
      request: httpHandlerRequest,
      route: undefined,
    };
    nodeHttpStreams.responseStream.write(this.httpHandler.handle(httpHandlerContext));
    return of();
  }

  /**
   * canHandle always returns an Observable of true.
   *
   * @param {NodeHttpStreams} input
   * @returns {Observable<boolean>}
   */
  canHandle(input: NodeHttpStreams): Observable<boolean> {
    return of(true);
  }
}
