import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandler, HttpHandlerContext, HttpHandlerController, HttpHandlerResponse, HttpHandlerRoute } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { NodeHttpStreamsHandler } from './node-http-streams.handler';
import { NodeHttpStreams } from './node-http-streams.model';

/**
 * A {HttpHandler} handling requests based on routes in a given list of {HttpHandlerController}s.
 *
 * @class
 */
export class RoutedHttpRequestHandler extends HttpHandler {

  /**
   * Creates a RoutedHttpRequestHandler, super calls the HttpHandler class and expects a list of HttpHandlerControllers
   *
   * @param {HttpHandlerController[]} handlerControllerList - a list of HttpHandlerController objects
   */
  constructor(private handlerControllerList: HttpHandlerController[]) {
    super();
  }

  /**
   * Passes the {HttpHandlerContext} to the handler of the {HttpHandlerRoute} mathing the request's path.
   *
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
      .filter(({ methods }) => methods.includes(request.method))
      .pop();

    return matchedRequestRoute ? matchedRequestRoute.handler.handle({ request, route: matchedRequestRoute.route }) : of({ body: '', headers: {}, status: 404 });
  }

  /**
   * Indicates that this handler can handle every `HttpHandlerContext `.
   *
   * @returns always `of(true)`
   * @param {HttpHandlerContext} context - a HttpHandlerContext object containing a HttpHandlerRequest and HttpHandlerRoute
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return of(true);
  }
}
