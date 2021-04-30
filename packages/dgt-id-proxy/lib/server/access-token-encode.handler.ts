
import { readFile } from 'fs/promises';
import { join } from 'path';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { of, throwError, zip, from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { JWK, JWTPayload } from 'jose/webcrypto/types';
import { SignJWT } from 'jose/jwt/sign';
import { parseJwk } from 'jose/jwk/parse';
import { v4 as uuid }  from 'uuid';

export class AccessTokenEncodeHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor(private pathToJwks: string, private proxyUrl: string) {
    super();

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

    if (!response.body.access_token) {
      return throwError(new Error('the response body did not include an access token, or the response body is not JSON'));
    }
    // create a signed access token based on the access_token payload
    return this.signJwtPayload(response.body.access_token.payload).pipe(
      // create a response including the signed access token and stringify the body
      switchMap((encodedToken) => this.createEncodedAccessTokenResponse(response, encodedToken)),
    );
  }

  private getSigningKit = () => from(readFile(join(process.cwd(), this.pathToJwks))).pipe(
    switchMap<Buffer, JWK>((keyFile) => of(JSON.parse(keyFile.toString()).keys[0])),
    switchMap((jwk) => zip(of(jwk.alg), of(jwk.kid), from(parseJwk(jwk)))),
  );

  private signJwtPayload = (jwtPayload: JWTPayload) => zip(of(jwtPayload), this.getSigningKit()).pipe(
    switchMap(([ payload, [ alg, kid, key ] ]) => from(
      new SignJWT(payload)
        .setProtectedHeader({ alg, kid, typ: 'at+jwt'  })
        .setExpirationTime('2h')
        .setIssuedAt()
        .setJti(uuid())
        .setIssuer(this.proxyUrl)
        .sign(key),
    )),
  );

  private createEncodedAccessTokenResponse(
    response: HttpHandlerResponse,
    encodedAccessToken: string,
  ) {
    response.body.access_token = encodedAccessToken;
    return of({
      body: JSON.stringify(response.body),
      headers: {
        'content-type':  'application/json',
      },
      status: 200,
    });
  }

  canHandle(response: HttpHandlerResponse) {
    return response
      ? of(true)
      : of(false);
  }
}
