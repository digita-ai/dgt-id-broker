import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, switchMap, throwError } from 'rxjs';
import { KeyValueStore } from '../storage/key-value-store';
import { isSafariUserAgent } from '../util/is-safari-user-agent';

export class SafariCookieSaveHandler extends HttpHandler {

  constructor(
    private httpHandler: HttpHandler,
    private cookieStore: KeyValueStore<string, string>
  ) {

    super();

    if (!httpHandler) { throw new Error('A HttpHandler must be provided'); }

    if (!cookieStore) { throw new Error('A cookie store must be provided'); }

  }

  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) return throwError(() => new Error('Context cannot be null or undefined'));

    if (!context.request) return throwError(() => new Error('No request was included in the context'));

    if (!context.request.url) return throwError(() => new Error('A URL must be provided'));

    if (!context.request.headers) return throwError(() => new Error('No headers were found in the request'));

    const userAgent = context.request.headers['user-agent'];

    if (!userAgent) return this.httpHandler.handle(context);

    const safariAgent = isSafariUserAgent(context.request.headers['user-agent']);

    return this.httpHandler.handle(context).pipe(
      switchMap((response: HttpHandlerResponse) => {

        const state = response.headers.location.split('state=')[1];

        const cookies = response.headers['set-cookie'];

        if(safariAgent) this.cookieStore.set(state, cookies);

        return of(response);

      }),
    );

  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
    && context.request
    && context.request.url
    && context.request.headers
      ? of(true)
      : of(false);

  }

}
