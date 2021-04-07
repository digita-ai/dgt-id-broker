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

  private pathToRouteMap: Map<string, HttpHandlerRoute>;

  /**
   * Creates a RoutedHttpRequestHandler, super calls the HttpHandler class and expects a list of HttpHandlerControllers
   *
   * @param {HttpHandlerController[]} handlerControllerList - a list of HttpHandlerController objects
   */
  constructor(private handlerControllerList: HttpHandlerController[]) {
    super();

    if(!handlerControllerList){
      throw new Error('handlerControllerList must be defined.');
    }

    this.pathToRouteMap = new Map(
      this.handlerControllerList
        .flatMap((controller) => controller.routes)
        .map((route) => [ route.path, route ]),
    );
  }

  /**
   * Passes the {HttpHandlerContext} to the handler of the {HttpHandlerRoute} mathing the request's path.
   *
   * @param {HttpHandlerContext} input - a HttpHandlerContext object containing a HttpHandlerRequest and HttpHandlerRoute
   */
  handle(input: HttpHandlerContext): Observable<HttpHandlerResponse> {
    if (!input) {
      return throwError(new Error('input must be defined.'));
    }
    if (!input.request) {
      return throwError(new Error('input.request must be defined.'));
    }
    const request = input.request;

    const matchingRoute = this.pathToRouteMap.get(request.path);
    const routeIncludesMethod = matchingRoute?.operations
      .flatMap((operation) => operation.method).includes(request.method);

    return matchingRoute && routeIncludesMethod ? matchingRoute.handler.handle({ request, route: matchingRoute }) : of({ body: '', headers: {}, status: 404 });
  }

  /**
   * Indicates that this handler can handle every `HttpHandlerContext `.
   *
   * @returns always `of(true)`
   * @param {HttpHandlerContext} context - a HttpHandlerContext object containing a HttpHandlerRequest and HttpHandlerRoute
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return context && context.request ? of(true) : of(false);
  }
}
