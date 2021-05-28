import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { getWebID } from '../util/get-webid';
import { recalculateContentLength } from '../util/recalculate-content-length';
import { parseQuads, getOidcRegistrationTriple } from '../util/process-webid';

export class SolidClientStaticTokenRegistrationHandler extends HttpHandler {

  constructor(
    private httpHandler: HttpHandler,
    private clientID: string,
    private clientSecret: string,
  ){

    super();

    if (!httpHandler) {

      throw new Error('No handler was provided');

    }

    if (!clientID) {

      throw new Error('No clientID was provided');

    }

    if (!clientSecret) {

      throw new Error('No clientSecret was provided');

    }

  }

  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) {

      return throwError(new Error('A context must be provided'));

    }

    if (!context.request) {

      return throwError(new Error('No request was included in the context'));

    }

    if (!context.request.body) {

      return throwError(new Error('No body was included in the request'));

    }

    const params  = new URLSearchParams(context.request.body);
    const client_id = params.get('client_id');
    const grant_type = params.get('grant_type');
    const redirect_uri = params.get('redirect_uri');

    if (!client_id) {

      return throwError(new Error('No client_id was provided'));

    }

    if (!grant_type) {

      return throwError(new Error('No grant_type was provided'));

    }

    if (!redirect_uri) {

      return throwError(new Error('No redirect_uri was provided'));

    }

    return from(getWebID(client_id))
      .pipe(
        switchMap((response) => (response.headers.get('content-type') !== 'text/turtle')
          ? throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`))
          : from(response.text())),
        map((text) => parseQuads(text)),
        switchMap((quads) => getOidcRegistrationTriple(quads)),
        switchMap((text) => (text.grant_types.includes(grant_type))
          ? of(text)
          : throwError(new Error('The grant type in the request is not included in the WebId'))),
        map(() => {

          params.set('client_id', this.clientID);
          params.set('client_secret', this.clientSecret);

          return { ...context, request: { ...context.request, body: params.toString() } };

        }),
        switchMap((newContext) => zip(of(newContext), of(recalculateContentLength(newContext.request)))),
        tap(([ newContext, length ]) => newContext.request.headers['content-length'] = length),
        switchMap(([ newContext ]) => this.httpHandler.handle(newContext)),
      );

  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
    && context.request
    && context.request.body
      ? of(true)
      : of(false);

  }

}
