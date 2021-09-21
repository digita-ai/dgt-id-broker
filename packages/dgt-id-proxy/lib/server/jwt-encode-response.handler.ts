
import { readFile } from 'fs/promises';
import * as path from 'path';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, throwError, zip, from, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { JWK, JWTPayload } from 'jose/webcrypto/types';
import { SignJWT } from 'jose/jwt/sign';
import { parseJwk } from 'jose/jwk/parse';
import { v4 as uuid }  from 'uuid';

/**
 * A {JwtField} class, used to enforce the existance of a field and type in the jwtFields parameter of {JwtEncodeResponseHandler}
 */
export class JwtField {

  /**
   * Creates a {JwtField}
   *
   * @param {string} field - the field that contains a jwt
   * @param {string} type - the type that should be set in the encoded JWT header 'typ' claim.
   */
  constructor(public field: string, public type: string) {}

}

/**
 * A {Handler} that handles an {HttpHandlerResponse} by getting the decoded header and payload objects
 * from the response body and creates a new JWT token with them. The tokens are signed and placed in the
 * specified fields in the response body.
 */
export class JwtEncodeResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Creates a {JwtEncodeResponseHandler}.
   *
   * @param {JwtField[]} jwtFields - the fields of the response body containing tokens to encode, and what type should be set in the token's header.
   * @param {string} pathToJwks - the relative path to a json file containing JWKs to sign the tokens.
   * @param {string} proxyUrl - the url of the proxy which should be set in the issuer claim of tokens.
   */
  constructor(
    private jwtFields: JwtField[],
    private pathToJwks: string,
    private proxyUrl: string,
  ) {

    super();

    if (!jwtFields || jwtFields.length === 0) { throw new Error('jwtFields must be defined and must contain at least 1 field'); }

    if (!pathToJwks) { throw new Error('A pathToJwks must be provided'); }

    if (!proxyUrl) { throw new Error('A proxyUrl must be provided'); }

  }

  /**
   * Handles the response. If the response body contains the specified fields, and the fields contain a JSON header and payload object
   * the payload is used to create a new signed JWT token and placed in the response body.
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse>  {

    if (!response) { return throwError(new Error('response cannot be null or undefined')); }

    if (response.status !== 200) { return of(response); }

    for (const { field } of this.jwtFields) {

      if (!response.body[field]) {

        return throwError(new Error(`the response body did not include the field "${field}"`));

      }

      if (!response.body[field].payload || !response.body[field].header) {

        return throwError(new Error(`the response body did not include a header and payload property for the field "${field}"`));

      }

    }

    const signedTokens: Observable<[string, string]>[] = this.jwtFields.map(({ field, type }) => (
      zip(of(field), this.signJwtPayload(response.body[field].payload, type))
    ));

    return zip(...signedTokens).pipe(
      map((tokenAndFields) => tokenAndFields.forEach(([ field, token ]) => response.body[field] = token)),
      map(() => ({
        body: JSON.stringify(response.body),
        headers: {
          ...response.headers,
          'content-type':  'application/json',
        },
        status: 200,
      })),
    );

  }

  private getSigningKit = () => from(readFile(
    path.isAbsolute(this.pathToJwks) ? this.pathToJwks : path.join(process.cwd(), this.pathToJwks)
  )).pipe(
    switchMap<Buffer, JWK>((keyFile) => of(JSON.parse(keyFile.toString()).keys[0])),
    switchMap((jwk) => zip(of(jwk.alg), of(jwk.kid), from(parseJwk(jwk)))),
  );

  private signJwtPayload = (jwtPayload: JWTPayload, typ: string) => zip(of(jwtPayload), this.getSigningKit()).pipe(
    switchMap(([ payload, [ alg, kid, key ] ]) => from(
      new SignJWT(payload)
        .setProtectedHeader({ alg, kid, typ })
        .setJti(uuid())
        .setIssuer(this.proxyUrl)
        .sign(key),
    )),
  );

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
