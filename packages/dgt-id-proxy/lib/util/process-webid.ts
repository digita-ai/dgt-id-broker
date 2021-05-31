import { BadRequestHttpError } from '@digita-ai/handlersjs-http';
import { Store, Parser, Quad } from 'n3';
import {  throwError, of, Observable } from 'rxjs';
import { OidcClientMetadata } from './oidc-client-metadata';

export const getWebID = (webID: string): Promise<Response> => fetch(webID, {
  method: 'GET',
  headers: {
    Accept: 'text/turtle',
  },
});

export const parseQuads = (text: string): Quad[] => {

  const n3Store = new Store();
  const parser = new Parser();
  n3Store.addQuads(parser.parse(text));

  // adding these null values gives u a wildcard to check out all the quads in store, in JS this is just getQuads()
  return n3Store.getQuads(null, null, null, null);

};

export const getOidcRegistrationTriple = (quads: Quad[]): Observable<Partial<OidcClientMetadata>> => {

  const foundQuad = quads.find((quad) => quad.predicate.id === 'http://www.w3.org/ns/solid/terms#oidcRegistration');

  if (!foundQuad) {

    return throwError(new BadRequestHttpError('Not a valid webID: No oidcRegistration field found'));

  }

  const object = foundQuad.object;
  // this has to be done because for some strange reason the whole object is surrounded by quotes
  const objectSub = object.id.substring(1, object.id.length - 1);
  const JSONObject = JSON.parse(objectSub);

  return of(JSONObject);

};
