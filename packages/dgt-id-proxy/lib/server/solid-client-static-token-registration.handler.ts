import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable,  throwError, of, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { getPod } from '../util/get-pod';
import { validateWebID } from '../util/validate-webid';

export class SolidClientStaticTokenRegistrationHandler extends HttpHandler {

  constructor(private httpHandler: HttpHandler){

    super();

    if (!httpHandler) {

      throw new Error('No handler was provided');

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

    return from(getPod(client_id))
      .pipe(
        switchMap((response) => {

          if (response.headers.get('content-type') !== 'text/turtle') {

            return throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`));

          }

          return from(response.text());

        }),
        switchMap((text) => validateWebID(text, client_id, redirect_uri)),
        switchMap((text) => {

          if (!text.grant_types.includes(grant_type)) {

            return throwError(new Error('The grant type in the request is not included in the WebId'));

          }

          return this.httpHandler.handle(context);

        }),
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
