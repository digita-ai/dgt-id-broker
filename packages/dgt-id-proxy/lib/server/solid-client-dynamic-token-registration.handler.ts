import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from } from 'rxjs';
import { switchMap, switchMapTo, mapTo, tap } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';
import { recalculateContentLength } from '../util/recalculate-content-length';

export class SolidClientDynamicTokenRegistrationHandler extends HttpHandler {
  constructor(private store: KeyValueStore<string, HttpHandlerResponse>, private httpHandler: HttpHandler) {
    super();
  }

  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {
    const client_id = context.request.url.searchParams.get('client_id');

    if (!client_id) {
      return throwError(new Error('No client_id was provided'));
    }

    const params  = new URLSearchParams(context.request.body);

    return from(this.store.get(client_id)).pipe(
      switchMap((registerInfo) => registerInfo
        ? of(registerInfo)
        : throwError(new Error('No data was found in the store'))),
      tap((registerInfo) => {
        // JSON storen ipv response
        params.set(client_id, registerInfo.body.client_id);
        context.request.body = params.toString();
      }),
      mapTo(recalculateContentLength(context.request)),
      tap((length) => context.request.headers['content-length'] = length),
      switchMapTo(this.httpHandler.handle(context)),
    );

  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return context ? of(true) : of(false);
  }
}
