
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, throwError, Observable, zip } from 'rxjs';
import { map } from 'rxjs/operators';
import { decode } from 'jose/util/base64url';
import { verifyUpstreamJwk } from '../util/verify-upstream-jwk';

export class JwtDecodeHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor (private jwtFields: string[], private upstreamUrl: string, private verifyJwk: boolean) {

    super();

    if (!jwtFields || jwtFields.length === 0) {

      throw new Error('jwtFields must be defined and must contain at least 1 field');

    }

    if (!upstreamUrl) {

      throw new Error('upstreamUrl must be defined');

    }

    if (verifyJwk === null || verifyJwk === undefined) {

      throw new Error('verifyJwk must be defined');

    }

  }

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) {

      return throwError(new Error('response cannot be null or undefined'));

    }

    if (response.status !== 200) {

      return of(response);

    }

    const parsedBody = JSON.parse(response.body);

    // check if the fields are present on the response body
    for (const field of this.jwtFields) {

      if (!parsedBody[field]) {

        return throwError(new Error(`the response body did not include the field "${field}"`));

      }

      if (typeof parsedBody[field] !== 'string' || parsedBody[field].split('.').length < 3) {

        return throwError(new Error(`the response body did not include a valid JWT for the field "${field}"`));

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
          header: JSON.parse(decode(parsedBody[field].split('.')[0]).toString()),
          payload: JSON.parse(decode(parsedBody[field].split('.')[1]).toString()),
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

  canHandle(response: HttpHandlerResponse) {

    return response
      ? of(true)
      : of(false);

  }

}
