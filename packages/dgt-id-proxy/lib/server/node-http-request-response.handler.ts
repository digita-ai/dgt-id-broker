import { HttpHandler, HttpHandlerRequest, HttpHandlerResponse, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { Observable, Subject, of, throwError, combineLatest } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { NodeHttpStreamsHandler } from './node-http-streams.handler';
import { NodeHttpStreams } from './node-http-streams.model';

/**
 * A {NodeHttpStreamsHandler} reading the request stream into a {HttpHandlerRequest}, passing it through a {HttpHandler} and writing the resulting {HttpHandlerResponse} to the response stream.
 */
export class NodeHttpRequestResponseHandler extends NodeHttpStreamsHandler {
  /**
   * Creates a {NodeHttpRequestResponseHandler} passing requests through the given handler.
   *
   * @param {HttpHandler} httpHandler - the handler through which to pass incoming requests.
   */
  constructor(private httpHandler: HttpHandler){
    super();

    if(!httpHandler){
      throw new Error('A HttpHandler object must be provided');
    }
  }

  /**
   * Reads the requestStream of its NodeHttpStreams pair into a HttpHandlerRequest,
   * creates a HttpHandlerContext from it, passes it through the {HttpHandler},
   * and writes the result to the responseStream.
   *
   * @param {NodeHttpStreams} noteHttpStreams - the incoming set of Node.js HTTP read and write streams
   * @returns an {Observable<void>} for completion detection
   */
  handle(nodeHttpStreams: NodeHttpStreams): Observable<void> {
    if (!nodeHttpStreams.requestStream.url){
      return throwError(new Error('url of the request cannot be null or undefined.'));
    }
    if (!nodeHttpStreams.requestStream.method) {
      return throwError(new Error('method of the request cannot be null or undefined.'));
    }
    if (!nodeHttpStreams.requestStream.headers) {
      return throwError(new Error('headers of the request cannot be null or undefined.'));
    }
    const chunks: any = [];
    let data = '';
    const subject = new Subject<string>();
    nodeHttpStreams.requestStream.on('data', (chunk) => chunks.push(chunk));
    nodeHttpStreams.requestStream.on('end', () => {
      data = Buffer.concat(chunks).toString();
      subject.next(data);
      subject.complete();
    });

    return combineLatest(
      subject,
      of(nodeHttpStreams.requestStream.url),
      of(nodeHttpStreams.requestStream.method),
      of(nodeHttpStreams.requestStream.headers),
    ).pipe(
      map(([ body, url, method, headers ]) => {
        const httpHandlerRequest = {
          path: url,
          method,
          headers: headers as { [key: string]: string },
        };

        const context: HttpHandlerContext = { request: body !== '' ? Object.assign(httpHandlerRequest, { body }) : httpHandlerRequest };
        return context;
      }),
      // eslint-disable-next-line no-console
      tap((context) => console.log('CONTEXT -----------', context)),
      switchMap((context) => this.httpHandler.handle(context)),
      map((response) => {
        nodeHttpStreams.responseStream.writeHead(response.status, response.headers);
        nodeHttpStreams.responseStream.write(response.body);
        nodeHttpStreams.responseStream.end();
      }),
    );
  }

  /**
   * Indicates this handler accepts every NodeHttpStreams pair as input.
   *
   * @param {NodeHttpStreams} input - the incoming streams
   * @returns always `of(true)`
   */
  canHandle(input: NodeHttpStreams): Observable<boolean> {
    return input && input.requestStream && input.responseStream &&
      input.requestStream !== null && input.responseStream !== null ? of(true) : of(false);
  }
}
