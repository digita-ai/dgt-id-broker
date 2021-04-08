import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, throwError } from 'rxjs';

/**
 * A mock of an HttpHandler used for tests
 */
export class MockHttpHandler extends HttpHandler {

  /**
   * Returns a mock response: ```
   * {
   * body: 'some mock output',
   * headers: {},
   * status: 200,
   * }
   * ```
   *
   * @param {HttpHandlerContext} context - an irrelevant incoming context
   * @returns {Observable<HttpHandlerResponse>} - the mock response
   */
  handle(context: HttpHandlerContext) {
    if (!context){
      return throwError(new Error('Context cannot be null or undefined'));
    }

    const response: HttpHandlerResponse = {
      body: 'some mock output',
      headers: {},
      status: 200,
    };
    return of(response);
  }

  /**
   * Indicates this handler accepts any input.
   *
   * @param {HttpHandlerContext} context - the irrelevant incoming context
   * @returns always `of(true)`
   */
  canHandle(context: HttpHandlerContext) {
    return context ? of(true) : throwError(new Error('Context cannot be null or undefined'));
  }
}
