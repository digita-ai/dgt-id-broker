import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandler, HttpHandlerContext, HttpHandlerController, HttpHandlerResponse, HttpHandlerRoute } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { NodeHttpStreamsHandler } from './node-http-streams.handler';
import { NodeHttpStreams } from './node-http-streams.model';

/**
 * RoutedHttpRequestHandler extending the HttpHandler class
 *
 * @class
 */
export class RoutedHttpRequestHandler extends HttpHandler {

  /**
   * Creates a RoutedHttpRequestHandler, super calls the HttpHandler class and expects a list of HttpHandlerControllers
   *
   * @constructor
   * @param {HttpHandlerController[]} handlerControllerList - a list of HttpHandlerController objects
   */
  constructor(private handlerControllerList: HttpHandlerController[]) {
    super();
  }

  /**
   * handle returns a type Observable<HttpHandlerResponse>
   *
   * @function
   * @param {HttpHandlerContext} input - a HttpHandlerContext object containing a HttpHandlerRequest and HttpHandlerRoute
   */
  handle(input: HttpHandlerContext): Observable<HttpHandlerResponse> {
    const request = input.request;

    const matchedRequestRoute = this.handlerControllerList
      .flatMap((controller) => controller.routes)
      .filter((route) => route.path === request.path)
      .flatMap((route) => ({
        route,
        methods: route.operations.flatMap((operation) => operation.method),
        handler: route.handler,
      }))
      .filter(({ route, methods, handler }) => methods.includes(request.method))
      .pop();

    if(matchedRequestRoute) {
      const httpHandlerContext: HttpHandlerContext = { request, route: matchedRequestRoute.route };
      return matchedRequestRoute.handler.handle(httpHandlerContext);
    } else {
      const httpHandlerResponse: HttpHandlerResponse = { body: '', headers: {}, status: 404 };
      return of(httpHandlerResponse);
    }
  }

  /**
   * canHandle returns a type Observable<Boolean>. This Boolean is always true.
   *
   * @function
   * @param {HttpHandlerContext} input - a HttpHandlerContext object containing a HttpHandlerRequest and HttpHandlerRoute
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return of(true);
  }
}

