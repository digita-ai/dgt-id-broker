import { BadRequestHttpError, ForbiddenHttpError } from '@digita-ai/handlersjs-http';
import { Store, Parser } from 'n3';
import {  throwError, of } from 'rxjs';

export const validateWebID = (text: string, client_id: string, redirect_uri: string) => {

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

};
