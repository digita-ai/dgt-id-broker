import { assert } from 'console';
import { get, RequestOptions, request } from 'http';
import { OutgoingHttpHeaders } from 'http2';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, from } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Request } from 'node-fetch';

/**
 *
 * @class
 */
export class PassThroughHttpRequestHandler extends HttpHandler {
  /**
   * Creates a Pass Trough Request Handler
   *
   * @param {string} url - the request URL
   */

  // Should this be a URL object or just a string?
  constructor(public url: string) {
    super();

    if(!url){
      throw new Error('No url was provided');
    }
  }

  handle(context: HttpHandlerContext, response?: HttpHandlerResponse): Observable<HttpHandlerResponse> {
    if (!context) {
      throw new Error('Context cannot be null or undefined');
    }

    if (!context.request) {
      throw new Error('No request was included in the context');
    }

    if (!context.request.method) {
      throw new Error('No method was included in the request');
    }

    if (!context.request.headers) {
      throw new Error('No headers were included in the request');
    }

    if (!context.request.path) {
      throw new Error('No path was included in the request');
    }

    const req = context.request;
    const reqMethod = req.method;
    const reqHeaders = req.headers;
    const reqBody = req.body;
    const reqPath = req.path;

    return this.fetchRequest(reqPath, reqMethod, reqHeaders, reqBody).pipe(
      tap((res) => assert(res)),
      switchMap((res) => {
        // eslint-disable-next-line no-console
        console.log('RESPONSE FROM GET ----', res);
        return of(res);

        // let headers = {};
        // res.headers.forEach((val: string, key: string) => {
        //   headers = { ...headers, [key]: val };
        // });

        // return from(res.headers.get('content-type') === 'application/json' ? res.json() : res.text()).pipe(
        //   map((body) => {
        //     const httpHandlerResponse: HttpHandlerResponse = { body, headers, status: res.status };
        //     return httpHandlerResponse;
        //   }),
        // );
      }),
    );
  }

  private fetchRequest(
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: any,
  ): Observable<HttpHandlerResponse>{
    const outgoingHttpHeaders: OutgoingHttpHeaders = headers;

    const requestOpts: RequestOptions = { hostname: 'localhost', port: 3000, path, method, headers: outgoingHttpHeaders };
    // eslint-disable-next-line no-console
    console.log('BODY ----', body);
    const prom =  new Promise((resolve, reject) => {
      const req = request(requestOpts, (res) => {
        const bod: any = [];
        res.on('data', (chunk) => bod.push(chunk));
        res.on('end', () => {
          const httpHandlerResponse: HttpHandlerResponse = {
            body: Buffer.concat(bod).toString(),
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
    }) as Promise<HttpHandlerResponse>;
    return from(prom);

    // return method.toLowerCase() === 'get' || method.toLowerCase() === 'head' ?
    //   from(
    //     fetch(url, {
    //       method,
    //       headers,
    //     }),
    //   ) : from(
    //     fetch(url, {
    //       method,
    //       headers,
    //       body,
    //     }),
    //   );
  }

  canHandle(context: HttpHandlerContext, response?: HttpHandlerResponse): Observable<boolean> {
    return context && context.request ? of(true) : of(false);
  }
}

