import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import fetch from 'node-fetch';
import { Store, Parser } from 'n3';
import { Observable,  throwError, of, from } from 'rxjs';
import { switchMap, tap, mapTo, map } from 'rxjs/operators';
import { KeyValueStore } from '../storage/key-value-store';

export class SolidClientDynamicRegistrationHandler extends HttpHandler {

  constructor(private store: KeyValueStore<string, HttpHandlerResponse>, private httpHandler: HttpHandler) {
    super();

    if (!store) {
      throw new Error('No store was provided');
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

    if (!context.request) {
      return throwError(new Error('No request was included in the context'));

    }

    if (context.request.url.pathname === '/auth' && context.request.method !== 'OPTIONS') {

      const client_id = context.request.url.searchParams.get('client_id');
      const redirect_uri = context.request.url.searchParams.get('redirect_uri');
      const client_name = 'My client application';

      if (!client_id) {
        return throwError(new Error('No client_id was provided'));
      }

      const reqData = {
        client_name,
        client_id,
        'redirect_uris': [
          redirect_uri,
        ],
        'token_endpoint_auth_method' : 'none',
      };

      /* this.registerClient(reqData)
        .then(async (data) => {
          this.store.set(client_id, data);
        });

      this.getPod(client_id)
        .then(async (data) => {
          const text = data.text();
          return data.headers.get('content-type') === 'text/turtle' ? this.validateWebID(text) : throwError(new Error(''));
        }); */

      return from(this.getPod(client_id))
        .pipe(
          switchMap((response) => {
            if (response.headers.get('content-type') !== 'text/turtle') {
              return throwError(new Error(''));
            }
            return from(response.text());
          }),
          switchMap((text) => this.validateWebID(text)),

          switchMap((podData) => this.httpHandler.handle(context)),
        );
    }

    return this.httpHandler.handle(context);
  }

  canHandle(context: HttpHandlerContext): Observable<boolean> {
    return context ? of(true) : of(false);
  }

  async readClientRegistration(client_id: string, context: HttpHandlerContext) {
    const url = `http://localhost:3000/reg/${client_id}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    return response;
  }

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

  async validateWebID(text: string) {
    const n3Store = new Store();
    const parser = new Parser();
    n3Store.addQuads(parser.parse(text));
    const quads = n3Store.getQuads(null, null, null, null);
    quads.map((quad) => {
      // eslint-disable-next-line no-console
      console.log(quad);
    });
  }

  // async getOIDCRegistrationFromWebID(client_id: string) {
  //   // Get the information from the pod in turtle format.
  //   const data = await this.getPod(client_id);

  //   // Get the text from the response.
  //   const text = await data.text();

  //   let typeFound = false;
  //   // Check to make sure the response returned the "text/turtle" format.
  //   for (const pair of data.headers.entries()) {
  //     if (pair[0] === 'content-type' && pair[1] === 'text/turtle') {
  //       typeFound = true;
  //     }
  //   }
  //   // If the type is correct, continue.
  //   if (typeFound) {
  //     // Parse the turtle text into javascript, and get the quads.
  //     store.addQuads(parser.parse(text));
  //     const quads = store.getQuads();

  //     // Find the oidcRegistration term.
  //     for (const quad of quads) {
  //       if (
  //         quad._predicate.id ===
  //               'http://www.w3.org/ns/solid/terms#oidcRegistration'
  //       ) {

  //         // Create a valid JSON object from the oidcRegistration field.
  //         const object = quad._object;
  //         const objectSub = object.id.substring(1, object.id.length - 1);
  //         const JSONObject = JSON.parse(objectSub);

  //         // If the client_id that sent the request matches the client_id in the oidcRegistration field, we know it's valid.
  //         if (client_id === JSONObject.client_id) {
  //           valid = true;
  //         }

  //         // Return the oidcRegistration information.
  //         return JSONObject;
  //       }
  //     }
  //   }
  //   // In all other cases return undefined.
  //   return undefined;
  // }

}
