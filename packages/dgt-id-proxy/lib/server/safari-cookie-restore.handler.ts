import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { from, Observable, of, switchMap, throwError } from 'rxjs';
import { KeyValueStore } from '../storage/key-value-store';
import { isSafariUserAgent } from '../util/is-safari-user-agent';

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

    const userAgent = context.request.headers['user-agent'];

    if (!userAgent) return throwError(() => new Error('No userAgent was found in the request'));
    // check if user agent is safari
    const safariAgent = isSafariUserAgent(context.request.headers['user-agent']);
    // if not safari no need to store cookies
    if (!safariAgent) return this.httpHandler.handle(context);

    const state = context.request.url.searchParams.get('state');

    if (!state) return throwError(() => new Error('No state was found in the request'));

    /* if there is a state in the referer header it will be the state the cookies
    were initially linked to in the store */
    const refererState = context.request.headers.referer.split('state=')[1];

    // retrieve the cookies with refererState (or state if no referer is present, (initial request))
    return from(this.cookieStore.get(refererState ?? state)).pipe(
      switchMap((cookies) => {

        if (!cookies) return throwError(() => new Error('No matching cookies found for state ' + state));

        // swap the state for the cookies in the store
        if (refererState) this.cookieStore.set(state, cookies);

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
