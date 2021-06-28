import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { OutgoingHttpHeaders } from 'http2';
import { gunzipSync, gzipSync, brotliDecompressSync, brotliCompressSync } from 'zlib';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, from, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/**
 * A {HttpRequestHandler} passing all request to and responses from the upstream server without modification.
 */
export class PassThroughHttpRequestHandler extends HttpHandler {

  private proxyURL: URL;

  /**
   * Creates a PassThroughHttpRequestHandler with an upstream server on the provided location.
   *
   * @param {string} host - the host of the upstream server without scheme (is always http).
   * @param {number} port - the port to connect to on the upstream server.
   * @param {string} scheme - either 'http:' or 'https:'.
   * @param {string} proxyUrl - the url of the proxy server.
   * @param {boolean} errorHandling - toggles whether the handler should create it's own error response or use the upstream's
   */
  constructor(
    private host: string,
    private port: number,
    private scheme: string,
    private proxyUrl: string,
    private errorHandling: boolean = false
  ) {

    super();

    if (!host) {

      throw new Error('No host was provided');

    }

    if (!port) {

      throw new Error('No port was provided');

    }

    if (!scheme) {

      throw new Error('No scheme was provided');

    }

    if (scheme !== 'http:' && scheme !== 'https:') {

      throw new Error('Scheme should be "http:" or "https:"');

    }

    if (!proxyUrl) {

      throw new Error('No proxyUrl was provided');

    }

    try {

      this.proxyURL = new URL(proxyUrl);

    } catch (e) {

      throw new Error('proxyUrl must be a valid URL');

    }

  }

  /**
   * Takes the necessary parameters out of the {HttpHandlerRequest} from the {HttpHandlerContext} and passes them to fetchRequest.
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

    return this.fetchRequest(
      context.request.url,
      context.request.method,
      context.request.headers,
      context.request.body
    ).pipe(
      switchMap((response) => {

        if (this.errorHandling && response.status >= 400) {

          return throwError({ headers: response.headers, status: response.status });

        }

        return of(response);

      }),
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
  ): Observable<HttpHandlerResponse> {

    headers.host = this.host + ':' + this.port;
    const outgoingHttpHeaders: OutgoingHttpHeaders = headers;

    const requestOpts = {
      protocol: this.scheme,
      hostname: this.host,
      port: this.port,
      path: url.pathname + url.search,
      method,
      headers: outgoingHttpHeaders,
    };

    // if (requestOpts.path === '/oauth/token') {

    //   delete requestOpts.headers['accept-encoding'];

    // }

    return from(new Promise<HttpHandlerResponse>((resolve, reject) => {

      const responseCallback = (
        res: {
          on: (
            arg0: string,
            // eslint-disable-next-line @typescript-eslint/unified-signatures
            arg1: { (chunk: any): any; (err?: unknown): void; (): void })
          => void;
          headers: { [x: string]: string; location?: any };
          statusCode: number;
        }
      ) => {

        const buffer: any = [];

        res.on('data', (chunk) => buffer.push(chunk));

        res.on('error', (err) => reject(new Error('Error resolving the response in the PassThroughHandler: ' + err.message)));

        res.on('end', () => {

          try {

            const location = new URL(res.headers.location);
            const upstreamURL = new URL(this.scheme + '//' + this.host + ':' + this.port);

            if (upstreamURL.host === location.host) {

              location.host = this.proxyURL.host;
              location.protocol = this.proxyURL.protocol;
              location.port = this.proxyURL.port;
              res.headers.location = location.toString();

            }

          } catch (e) {
            // do nothing
          }

          const httpHandlerResponse: HttpHandlerResponse = {
            body: Buffer.concat(buffer),
            headers: res.headers as { [key: string]: string },
            status: res.statusCode ? res.statusCode : 500,
          };

          // DECODING AND ENCODING LOGIC SHOULD BE MOVED TO A SEPERATE MODULE - SEE: https://github.com/digita-ai/dgt-id-broker/issues/85#issuecomment-851438022

          // Check only html files
          if(httpHandlerResponse.headers['content-type'] && httpHandlerResponse.headers['content-type'].search('text/html') !== -1) {

            // decompress the data if it's compressed
            if (httpHandlerResponse.headers['content-encoding'] === 'gzip') {

              httpHandlerResponse.body = gunzipSync(httpHandlerResponse.body);

            } else if (httpHandlerResponse.headers['content-encoding'] === 'br') {

              httpHandlerResponse.body = brotliDecompressSync(httpHandlerResponse.body);

            }

            // replace any instance of the upstream's url with the proxy's url
            httpHandlerResponse.body = Buffer.from(
              httpHandlerResponse.body.toString().replace(new RegExp('(action="|src="|href=")' + new URL(this.scheme + '//' + this.host + ':' + this.port).toString(), 'g'), '$1' + this.proxyURL.toString())
            );

            // compress the data again
            if (httpHandlerResponse.headers['content-encoding'] === 'gzip') {

              httpHandlerResponse.body = gzipSync(httpHandlerResponse.body);

            } else if (httpHandlerResponse.headers['content-encoding'] === 'br') {

              httpHandlerResponse.body = brotliCompressSync(httpHandlerResponse.body);

            }

          }

          if (httpHandlerResponse.headers['content-type'] && httpHandlerResponse.headers['content-type'].search('application/json') !== -1) {

            if (httpHandlerResponse.headers['content-encoding'] === 'br') {

              httpHandlerResponse.body = brotliDecompressSync(httpHandlerResponse.body);

            }

            delete httpHandlerResponse.headers['content-encoding'];

          }

          resolve(httpHandlerResponse);

        });

      };

      const req = this.scheme === 'http:' ? httpRequest(requestOpts, responseCallback) : httpsRequest(requestOpts, responseCallback);

      if (body) {

        req.write(body);

      }

      req.on('error', (err) => reject(new Error('Error resolving the response in the PassThroughHandler: ' + err.message)));

      req.end();

    }));

  }

}
