import { assert } from 'console';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import fetch, { Response } from 'node-fetch';

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

    return this.fetchRequest(this.url + reqPath, reqMethod, reqHeaders, reqBody).pipe(
      tap((res) => assert(res)),
      map((res) => {
        let headers = {};
        res.headers.forEach((val: string, key: string) => {
          headers = { ...headers, [key]: val };
        });
        return { body: res.body, headers, status: res.status };
      }),
    );
  }

  private fetchRequest(
    url: string,
    reqMethod: string,
    reqHeaders: Record<string, string>,
    body?: any,
  ): Observable<Response>{
    const methodFetch = reqMethod;
    const headersFetch = reqHeaders;
    const bodyFetch = reqMethod.toLowerCase() === 'post' ? JSON.stringify(body) : '';

    return methodFetch.toLowerCase() === 'get' || methodFetch.toLowerCase() === 'head' ?
      from(
        fetch(url, {
          method: methodFetch,
          headers: headersFetch,
        }),
      ) : from(
        fetch(url, {
          method: methodFetch,
          headers: headersFetch,
          body: bodyFetch,
        }),
      );
  }

  canHandle(context: HttpHandlerContext, response?: HttpHandlerResponse): Observable<boolean> {
    return context && context.request ? of(true) : of(false);
  }
}

