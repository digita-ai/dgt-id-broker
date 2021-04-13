import { assert } from 'console';
import { RequestOptions, request } from 'http';
import { OutgoingHttpHeaders } from 'http2';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, from, throwError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

/**
 * A {HttpRequestHandler} passing all request to and responses from the upstream server without modification.
 */
export class PassThroughHttpRequestHandler extends HttpHandler {

  /**
   * Creates a PassThroughRequestHandler with an upstream server on the provided location.
   *
   * @param {string} url - the location of the upstream server
   */
  constructor(public host: string, public port: number) {
    super();

    if(!host){
      throw new Error('No host was provided');
    }

    if(!port){
      throw new Error('No port was provided');
    }

  }

  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {
      return throwError(new Error('Context cannot be null or undefined'));
    }

    if (!context.request) {
      return throwError(new Error('No request was included in the context'));
    }

    if (!context.request.method) {
      return throwError(new Error('No method was included in the request'));
    }

    if (!context.request.headers) {
      return throwError(new Error('No headers were included in the request'));
    }

    if (!context.request.path) {
      return throwError(new Error('No path was included in the request'));
    }

    const req = context.request;
    const reqMethod = req.method;
    const reqHeaders = req.headers;
    const reqBody = req.body;
    const reqPath = req.path;

    return this.fetchRequest(reqPath, reqMethod, reqHeaders, reqBody).pipe(
      tap((res) => assert(res)),
      switchMap((res) => of(res)),
    );
  }

  private fetchRequest(
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: any,
  ): Observable<HttpHandlerResponse>{
    const outgoingHttpHeaders: OutgoingHttpHeaders = headers;

    const requestOpts: RequestOptions = { protocol: `http:`, hostname: this.host, port: this.port, path, method, headers: outgoingHttpHeaders };

    return from(new Promise<HttpHandlerResponse>((resolve, reject) => {
      const req = request(requestOpts, (res) => {
        const buffer: any = [];
        res.on('data', (chunk) => buffer.push(chunk));
        res.on('end', () => {
          const httpHandlerResponse: HttpHandlerResponse = {
            body: Buffer.concat(buffer).toString(),
            headers: res.headers as { [key: string]: string },
            status: res.statusCode ? res.statusCode : 500,
          };
          resolve(httpHandlerResponse);
        });
      });
      if (body) {
        req.write(body);
      }
      req.end();
    }));

  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return context
      && context.request
      && context.request.method
      && context.request.headers
      && context.request.path
      ? of(true)
      : of(false);
  }
}

