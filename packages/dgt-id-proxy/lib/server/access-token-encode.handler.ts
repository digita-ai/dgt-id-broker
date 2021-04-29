
import { readFile } from 'fs/promises';
import { join } from 'path';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { of, throwError, zip, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { JoseHeaderParameters, JWK, JWSHeaderParameters, JWTPayload } from 'jose/webcrypto/types';
import { SignJWT } from 'jose/jwt/sign';
import { parseJwk } from 'jose/jwk/parse';
import { v4 as uuid }  from 'uuid';

export class AccessTokenEncodeHandler extends HttpHandler {

  constructor(private handler: HttpHandler, private pathToJwks: string, private proxyUrl: string) {
    super();

    if (!handler) {
      throw new Error('A handler must be provided');
    }

    if(!pathToJwks){
      throw new Error('A pathToJwks must be provided');
    }

    if(!proxyUrl){
      throw new Error('A proxyUrl must be provided');
    }
  }

  handle(context: HttpHandlerContext) {
    if (!context) {
      return throwError(new Error('Context cannot be null or undefined'));
    }

    if (!context.request) {
      return throwError(new Error('No request was included in the context'));
    }

    if (!context.request.method) {
      return throwError(new Error('No method was included in the request'));
    }

    if (!context.request.headers) {
      return throwError(new Error('No headers were included in the request'));
    }

    if (!context.request.url) {
      return throwError(new Error('No url was included in the request'));
    }

    if (context.request.method === 'OPTIONS') {
      return this.handler.handle(context);
    }

    if (context.request.method !== 'POST') {
      return throwError(new MethodNotAllowedHttpError('this method is not supported.'));
    }

    return this.getUpstreamResponse(context).pipe(
      // create a signed access token based on the access_token payload
      switchMap((response) => zip(of(response), this.signJwtPayload(response.body.access_token.payload))),
      // create a response containing the decoded access token
      switchMap(([ response, encodedToken ]) => this.createEncodedAccessTokenResponse(
        response,
        encodedToken,
        context.request.headers.origin,
      )),
      // switches any errors with body into responses; all the rest are server errors which will hopefully be caught higher
      catchError((error) => error.body && error.headers && error.status ? of(error) : throwError(error)),
    );
  }

  private getUpstreamResponse = (context: HttpHandlerContext) => this.handler.handle(context).pipe(
    switchMap((response) => response.status === 200 ? of(response) : throwError(response)),
  );

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
    corsOrigin: string,
  ) {
    response.body.access_token = encodedAccessToken;

    return of({
      body: JSON.stringify(response.body),
      headers: {
        'access-control-allow-origin': corsOrigin,
        'content-type':  'application/json',
      },
      status: 200,
    });
  }

  canHandle(context: HttpHandlerContext) {
    return context
      && context.request
      && context.request.method
      && context.request.headers
      && context.request.url
      ? of(true)
      : of(false);
  }
}
