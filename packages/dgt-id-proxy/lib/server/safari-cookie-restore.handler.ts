import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { from, Observable, of, switchMap, throwError } from 'rxjs';
import { KeyValueStore } from '../storage/key-value-store';

export class SafariCookieRestoreHandler extends HttpHandler {

  constructor(private httpHandler: HttpHandler, private cookieStore: KeyValueStore<string, string>) {

    super();

    if (!httpHandler) { throw new Error('A HttpHandler must be provided'); }

    if (!cookieStore) { throw new Error('A cookie store must be provided'); }

  }

  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) return throwError(() => new Error('Context cannot be null or undefined'));

    if (!context.request) return throwError(() => new Error('No request was included in the context'));

    if (!context.request.headers) return throwError(() => new Error('No headers were found in the request'));

    if (!context.request.url) return throwError(() => new Error('A URL must be provided'));

    let state = context.request.url.searchParams.get('state');

    if (!state) return throwError(() => new Error('No state was found in the request'));

    const refererState = context.request.headers.referer.split('state=')[1];

    if (refererState && state !== refererState) state = refererState;

    return from(this.cookieStore.get(state)).pipe(
      switchMap((cookies) => {

        if (!cookies)return throwError(() => new Error('No matching cookies found for state ' + state));

        context.request.headers.cookie = cookies;

        return this.httpHandler.handle(context);

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
