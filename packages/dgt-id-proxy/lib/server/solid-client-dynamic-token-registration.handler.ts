import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, switchMapTo, mapTo, tap, map } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { recalculateContentLength } from '../util/recalculate-content-length';

export class SolidClientDynamicTokenRegistrationHandler extends HttpHandler {

  constructor(private store: KeyValueStore<string, any>, private httpHandler: HttpHandler) {

    super();

    if (!store) {

      throw new Error('A store must be provided');

    }

    if (!httpHandler) {

      throw new Error('A HttpHandler must be provided');

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

    if (!client_id) {

      return throwError(new Error('No client_id was provided'));

    }

    return from(this.store.get(client_id)).pipe(
      switchMap((registerInfo) => registerInfo
        ? of(registerInfo)
        : throwError(new Error('No data was found in the store'))),
      map((registerInfo) => {

        params.set('client_id', registerInfo.client_id);

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
