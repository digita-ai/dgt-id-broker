import { BadRequestHttpError, ForbiddenHttpError } from '@digita-ai/handlersjs-http';
import { Store, Parser, Quad } from 'n3';
import { Observable,  throwError, of, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { OidcClientMetadata } from './oidc-client-metadata';
import { OidcClientRegistrationResponse } from './oidc-client-registration-response';

/**
 * Performs a get request to retrieve the webid turtle file
 *
 * @param { string } webID
 */
export const getWebID = (webID: string): Promise<Response> => fetch(webID, {
  method: 'GET',
  headers: {
    Accept: 'text/turtle',
  },
});

/**
 * Parses the turtle text into Quad objects
 *
 * @param { string } text
 */
export const parseQuads = (text: string): Quad[] => {

  const n3Store = new Store();
  const parser = new Parser();
  n3Store.addQuads(parser.parse(text));

  // adding these null values gives u a wildcard to check out all the quads in store, in JS this is just getQuads()
  return n3Store.getQuads(null, null, null, null);

};

/**
 * Reads the quads and finds the oidcRegistration triple.
 * If it is not present it errors.
 * If it is, it parses the oidcRegistration triple quad into a JSON object
 *
 * @param { Quad } quad
 */
export const parseOidcRegistrationStatement = (quads: Quad[]): Observable<Partial<OidcClientMetadata>> => {

  const oidcRegistrationQuad = quads.find((quad) => quad.predicate.id === 'http://www.w3.org/ns/solid/terms#oidcRegistration');

  if (!oidcRegistrationQuad) {

    return throwError(new BadRequestHttpError('Not a valid webID: No oidcRegistration field found'));

  }

  const object = oidcRegistrationQuad.object;
  // this has to be done because for some strange reason the whole object is surrounded by quotes
  const objectSub = object.id.substring(1, object.id.length - 1);

  try {

    const JSONObject = JSON.parse(objectSub);

    return of(JSONObject);

  } catch(error) {

    return throwError(error);

  }

};

/**
 * A  retrieveAndValidateWebId function that:
 * - retrieves the WebId,
 * - checks if the returned type is turtle, and errors if not,
 * else it returns the WebId contentTypeHeader
 * - parses this into Quads
 * - checks if the oidcRegistration is present and returns a error if not
 * else it returns a JSON object
 *
 * @param clientId
 * @param contextRequestUrlSearchParams
 */
export const retrieveAndValidateWebId = (
  clientId: string
): Observable<Partial<OidcClientMetadata & OidcClientRegistrationResponse>> => from(getWebID(clientId)).pipe(
  switchMap((response) => response.headers.get('content-type') !== 'text/turtle'
    ? throwError(new Error(`Incorrect content-type: expected text/turtle but got ${response.headers.get('content-type')}`))
    : from(response.text())),
  map((text) => parseQuads(text)),
  switchMap((quads) => parseOidcRegistrationStatement(quads))
);

/**
 * Compares the data from the webid with the data given in the requests URLSearchParams.
 * It returns a 403 error when crucial parameters do not match
 *
 * @param { Partial<OidcClientMetadata> } clientData
 * @param { URLSearchParams } searchParams
 */
export const compareClientDataWithRequest = (
  clientData: Partial<OidcClientMetadata>,
  searchParams: URLSearchParams
): Observable<Partial<OidcClientMetadata>> => {

  if (clientData.client_id !== searchParams.get('client_id')) {

    return throwError(new ForbiddenHttpError('The client id in the request does not match the one in the WebId'));

  }

  if (!clientData.redirect_uris.includes(searchParams.get('redirect_uri'))) {

    return throwError(new ForbiddenHttpError('The redirect_uri in the request is not included in the WebId'));

  }

  if (!clientData.response_types.includes(searchParams.get('response_type')))  {

    return throwError(new ForbiddenHttpError('Response types do not match'));

  }

  return of(clientData);

};
