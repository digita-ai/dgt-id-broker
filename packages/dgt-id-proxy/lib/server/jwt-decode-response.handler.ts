
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, throwError, Observable, zip } from 'rxjs';
import { map } from 'rxjs/operators';
import { base64url } from 'jose';
import { verifyUpstreamJwk } from '../util/verify-upstream-jwk';
import { checkError, createErrorResponse } from '../util/error-response-factory';

/**
 * A {Handler} decoding JWTs for the specified fields of a {HttpHandlerResponse} body. Optionally verifies
 * the keys that were used to sign the tokens by an upstream server.
 */
export class JwtDecodeResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Creates a {JwtDecodeResponseHandler}.
   *
   * @param {string[]} jwtFields - the fields of the response body containing tokens to decode.
   * @param {string} upstreamUrl - the url of the upstream server. Used to get the JWKs that were used to sign tokens.
   * @param {boolean} verifyJwk - specifies wether or not JWKs should be verified.
   */
  constructor (private jwtFields: string[], private upstreamUrl: string, private verifyJwk: boolean) {

    super();

    if (!jwtFields || jwtFields.length === 0) { throw new Error('jwtFields must be defined and must contain at least 1 field'); }

    if (!upstreamUrl) { throw new Error('upstreamUrl must be defined'); }

    if (verifyJwk === null || verifyJwk === undefined) { throw new Error('verifyJwk must be defined'); }

  }

  /**
   * Handles the response. Parses the response body to JSON, checks if the specified jwtFields exist on the response body,
   * then, if it needs to verify the upstream JWKs it will do so and receive the decoded header and payload, otherwise it
   * decodes the header and payload by itself, and sets them in the response body. The response body will then contain json
   * objects with a header and payload object for each decoded token.
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) { return throwError(() => new Error('response cannot be null or undefined')); }

    if (checkError(response)) {

      return of(createErrorResponse(
        checkError(response).error_description,
        checkError(response).error,
        response.headers
      ));

    }

    const parsedBody = JSON.parse(response.body);

    // check if the fields are present on the response body
    for (const field of this.jwtFields) {

      if (!parsedBody[field]) {

        return throwError(() => new Error(`the response body did not include the field "${field}"`));

      }

      if (typeof parsedBody[field] !== 'string' || parsedBody[field].split('.').length < 3) {

        return throwError(() => new Error(`the response body did not include a valid JWT for the field "${field}"`));

      }

    }

    // create a list of fields and the decoded token matching that field
    const tokens: Observable<[string, { header: any; payload: any }]>[] = this.jwtFields.map((field) => zip(
      of(field),
      this.verifyJwk
        ? verifyUpstreamJwk(parsedBody[field], this.upstreamUrl).pipe(
          map(({ protectedHeader, payload }) => ({ header: protectedHeader, payload })),
        )
        : of({
          header: JSON.parse(base64url.decode(parsedBody[field].split('.')[0]).toString()),
          payload: JSON.parse(base64url.decode(parsedBody[field].split('.')[1]).toString()),
        }),
    ));

    // set each of the requested fields to their decoded token in the response body
    return zip(...tokens).pipe(
      map((tokenAndFields) => tokenAndFields.forEach(([ field, token ]) => parsedBody[field] = token)),
      map(() => ({
        body: parsedBody,
        headers: response.headers,
        status: 200,
      })),
    );

  }

  /**
   * Specifies that if the response is defined this handler can handle the response.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response
      ? of(true)
      : of(false);

  }

}
