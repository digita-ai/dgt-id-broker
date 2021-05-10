
import { readFile } from 'fs/promises';
import { join } from 'path';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, throwError, zip, from, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { JWK, JWTPayload } from 'jose/webcrypto/types';
import { SignJWT } from 'jose/jwt/sign';
import { parseJwk } from 'jose/jwk/parse';
import { v4 as uuid }  from 'uuid';

export class JwtField {

  constructor(public field: string, public type: string) {}

}

export class JwtEncodeHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor(
    private jwtFields: JwtField[],
    private pathToJwks: string,
    private proxyUrl: string,
  ) {

    super();

    if (!jwtFields || jwtFields.length === 0) {

      throw new Error('jwtFields must be defined and must contain at least 1 field');

    }

    if(!pathToJwks){

      throw new Error('A pathToJwks must be provided');

    }

    if(!proxyUrl){

      throw new Error('A proxyUrl must be provided');

    }

  }

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse>  {

    if (!response) {

      return throwError(new Error('response cannot be null or undefined'));

    }

    if (response.status !== 200) {

      return of(response);

    }

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
          'content-type':  'application/json',
          ...response.headers,
        },
        status: 200,
      })),
    );

  }

  private getSigningKit = () => from(readFile(join(process.cwd(), this.pathToJwks))).pipe(
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

  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response
      ? of(true)
      : of(false);

  }

}
