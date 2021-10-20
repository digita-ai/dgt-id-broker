import { Handler } from '@digita-ai/handlersjs-core';
import { Observable, of, throwError, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Writer, DataFactory } from 'n3';

const { literal } = DataFactory;
export class WebIdProfileHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor(private predicates: { tokenKey: string; predicate: string }[]) {

    super();

    if (!predicates) { throw new Error('Predicate list is required'); }

  }

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) { return throwError(new Error('A response must be provided')); }

    return from(this.getWebIdProfile(response.body.id_token.payload.webId)).pipe(
      switchMap((data) => {

        if (data.status !== 200) {

          this.createWebIdProfile(
            response.body.id_token.payload.webId,
            this.generateProfileBody(this.predicates, response.body.id_token.payload.webId)
          );

        }

        return of(response);

      })
    );

  }

  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response ? of(true) : of(false);

  }

  getWebIdProfile = async (webId: string): Promise<Response>  => {

    const data = await fetch(webId, {
      method: 'HEAD',
      headers: {
        Accept: 'text/turtle',
      },
    });

    return data;

  };

  createWebIdProfile = async (webId: string, body: string): Promise<void>  => {

    await fetch(webId, {
      method: 'PUT',
      headers: {
        Accept: 'text/turtle',
      },
      body,
    });

  };

  generateProfileBody = (predicates: { tokenKey: string; predicate: string }[], webId: string): string => {

    const writer = new Writer({ prefixes: { foaf: 'http://xmlns.com/foaf/0.1/', solid: 'http://www.w3.org/ns/solid/terms#' } });
    let body = '';

    predicates.forEach((keyPredicatePair) => {

      writer.addQuad(
        DataFactory.namedNode(webId),
        DataFactory.namedNode(keyPredicatePair.tokenKey),
        literal(keyPredicatePair.predicate),
      );

    });

    writer.end((err, result) => body = result);

    return body;

  };

}

