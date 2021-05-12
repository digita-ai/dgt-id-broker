import { BadRequestHttpError, ForbiddenHttpError, HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Store, Parser } from 'n3';
import { Observable,  throwError, of, from, zip } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';

export class SolidClientDynamicAuthRegistrationHandler extends HttpHandler {

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

    const client_id = context.request.url.searchParams.get('client_id');
    const redirect_uri = context.request.url.searchParams.get('redirect_uri');

    if (!client_id) {

      return throwError(new Error('No client_id was provided'));

    }

    try {

      const url = new URL(client_id);

    } catch (error) {

      return throwError(new Error('The provided client_id is not a valid URL'));

    }

    if (!redirect_uri) {

      return throwError(new Error('No redirect_uri was provided'));

    }

    return from(this.getPod(client_id))
      .pipe(
        switchMap((response) => {

          if (response.headers.get('content-type') !== 'text/turtle') {

            return throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`));

          }

          return from(response.text());

        }),
        switchMap((text) => this.validateWebID(text, client_id, redirect_uri)),
        switchMap((text) => zip(of(text), from(this.store.get(client_id)))),
        switchMap(([ podData, registerData ]) => {

          const reqData = {
            'redirect_uris': podData.redirect_uris,
            'client_uri': podData.client_uri,
            'logo_uri': podData.logo_uri,
            'tos_uri': podData.tos_uri,
            'scope': podData.scope,
            'default_max_age': podData.default_max_age,
            'require_auth_time': podData.require_auth_time,
            'grant_types': podData.grant_types,
            'response_types': podData.response_types,
            'token_endpoint_auth_method' : 'none',
          };

          return registerData
            ? from(this.registerClient({ ...reqData, 'redirect_uris': [ redirect_uri ], 'scope':  context.request.url.searchParams.get('scope'), 'response_types': [ context.request.url.searchParams.get('response_type') ] }))
            : from(this.registerClient(reqData));

        }),
        tap((res) => this.store.set(client_id, res)),
        tap((res) => context.request.url.search = context.request.url.search.replace(new RegExp('client_id=+[^&.]+'), `client_id=${res.client_id}`)),
        switchMap(() => this.httpHandler.handle(context)),
      );

  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
    && context.request
    && context.request.url
      ? of(true)
      : of(false);

  }

  // async readClientRegistration(client_id: string, context: HttpHandlerContext) {
  //   const url = `http://localhost:3000/reg/${client_id}`;
  //   const response = await fetch(url, {
  //     method: 'GET',
  //     headers: {
  //       'Accept': 'application/json',
  //     },
  //   });
  //   return response;
  // }

  async registerClient(data: any) {

    const url = `http://localhost:3000/reg`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return response.json();

  }

  async getPod(webID: string) {

    const response = await fetch(webID, {
      method: 'GET',
      headers: {
        Accept: 'text/turtle',
      },
    });

    return response;

  }

  validateWebID(text: string, client_id: string, redirect_uri: string) {

    const n3Store = new Store();
    const parser = new Parser();
    n3Store.addQuads(parser.parse(text));
    // adding these null values gives u a wildcard to check out all the quads in store
    const quads = n3Store.getQuads(null, null, null, null);
    const foundQuad = quads.find((quad) => quad.predicate.id === 'http://www.w3.org/ns/solid/terms#oidcRegistration');

    if (!foundQuad) {

      return throwError(new BadRequestHttpError('Not a valid webID: No oidcRegistration field found'));

    }

    const object = foundQuad.object;
    // this has to be done because for some strange reason the whole object is surrounded by quotes
    const objectSub = object.id.substring(1, object.id.length - 1);
    const JSONObject = JSON.parse(objectSub);

    // If the client_id that sent the request matches the client_id in the oidcRegistration field, we know it's valid.
    return client_id === JSONObject.client_id
        && JSONObject.redirect_uris.includes(redirect_uri)
      ? of(JSONObject)
      : throwError(new ForbiddenHttpError('The data in the request does not match the one in the WebId'));

  }

}
