import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, throwError } from 'rxjs';

/**
 * A mock of an HttpHandler used for tests
 *
 * @class
 */
export class MockHttpHandler extends HttpHandler {

  /**
   * handle returns a type Observable<HttpHandlerResponse>. This HttpHandlerResponse always
   * has a body of 'some mock output', empty headers and status 200.
   *
   * @function
   * @param {HttpHandlerContext} context - a HttpHandlerContext object containing a HttpHandlerRequest and HttpHandlerRoute
   * @returns {Observable<HttpHandlerResponse>}
   */
  handle(context: HttpHandlerContext){
    if (!context){
      return throwError('Context cannot be null or undefined');
    }

    const response: HttpHandlerResponse = {
      body: 'some mock output',
      headers: {},
      status: 200,
    };
    return of(response);
  }

  /**
   * canHandle returns a type Observable<Boolean>. This always returns an Observable of true.
   *
   * @function
   * @param {HttpHandlerContext} context - a HttpHandlerContext object containing a HttpHandlerRequest and HttpHandlerRoute
   * @returns {Observable<Boolean>}
   */
  canHandle(context: HttpHandlerContext){
    if (!context){
      return throwError('Context cannot be null or undefined');
    }

    return of(true);
  }
}

