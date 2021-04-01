import { HttpHandler, HttpHandlerRequest, HttpHandlerResponse, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { map }from 'rxjs/operators';
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
    let httpHandlerRequest: HttpHandlerRequest;
    if (!nodeHttpStreams.requestStream.url){
      return throwError('url of the request cannot be null or undefined.');
    }else if (!nodeHttpStreams.requestStream.method){
      return throwError('method of the request cannot be null or undefined.');
    }else if (!nodeHttpStreams.requestStream.headers){
      return throwError('headers of the request cannot be null or undefined.');
    }else {
      httpHandlerRequest = {
        path: nodeHttpStreams.requestStream.url,
        method: nodeHttpStreams.requestStream.method,
        headers: nodeHttpStreams.requestStream.headers as { [key: string]: string },
      };
    }
    const httpHandlerContext: HttpHandlerContext = {
      request: httpHandlerRequest,
      route: undefined,
    };

    return this.httpHandler.handle(httpHandlerContext).pipe(
      map((response) => {
        nodeHttpStreams.responseStream.writeHead(response.status, response.headers);
        nodeHttpStreams.responseStream.write(response.body);
        nodeHttpStreams.responseStream.end();
      }),
    );

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
