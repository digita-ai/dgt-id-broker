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
   * @param {string} host - the host of the upstream server without scheme (is always http).
   * @param {number} port - the port to connect to on the upstream server.
   */
  constructor(public host: string, public port: number) {
    super();

    if (!host) {
      throw new Error('No host was provided');
    }
    if (!port) {
      throw new Error('No port was provided');
    }

  }

  /**
   * Takes the necessary parameters out of the {HttpHandlerRequest} ffrom the {HttpHandlerContext} and passes them to fetchRequest.
   * Returns the response as an {Observable<HttpHandlerResponse>}.
   *
   * @param {HttpHandlerContext} context - a HttpHandlerContext object containing a HttpHandlerRequest and HttpHandlerRoute
   */
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

    if (!context.request.url) {
      return throwError(new Error('No url was included in the request'));
    }

    const req = context.request;
    const reqMethod = req.method;
    const reqHeaders = req.headers;
    const reqBody = req.body;
    const reqUrl = req.url;

    return this.fetchRequest(reqUrl, reqMethod, reqHeaders, reqBody).pipe(
      tap((res) => assert(res)),
      switchMap((res) => of(res)),
    );
  }

  /**
   * Indicates that this handler can handle every {HttpHandlerContext} with non-null parameters.
   *
   * @param {HttpHandlerContext} context - a {HttpHandlerContext} object containing a {HttpHandlerRequest} and {HttpHandlerRoute}
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return context
      && context.request
      && context.request.method
      && context.request.headers
      && context.request.url
      ? of(true)
      : of(false);
  }

  /**
   * Makes a request to the host server using Node's http.request method.
   * Converts the response to a {HttpHandlerResponse} and returns it in an {Observable}.
   *
   * @param path - the path to make a request to on the host
   * @param method - the HTTP method
   * @param headers - the HTTP request headers
   * @param body - the request body
   */
  private fetchRequest(
    url: URL,
    method: string,
    headers: Record<string, string>,
    body?: any,
  ): Observable<HttpHandlerResponse>{
    const outgoingHttpHeaders: OutgoingHttpHeaders = headers;

    const requestOpts: RequestOptions = { protocol: `http:`, hostname: this.host, port: this.port, path: url.pathname + url.search, method, headers: outgoingHttpHeaders };

    return from(new Promise<HttpHandlerResponse>((resolve, reject) => {
      const req = request(requestOpts, (res) => {
        const buffer: any = [];
        res.on('data', (chunk) => buffer.push(chunk));
        res.on('error', (err) => reject(new Error('Error resolving the response in the PassThroughHandler')));
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
}

