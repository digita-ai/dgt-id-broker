import { join } from 'path';
import { readFile } from 'fs/promises';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { Observable, of, from, throwError, zip } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { decode } from 'jose/util/base64url';
import { JWK, JWTPayload } from 'jose/webcrypto/types';
import { SignJWT } from 'jose/jwt/sign';
import { parseJwk } from 'jose/jwk/parse';

/**
 * A {HttpHandler} that adds the 'solid' claim to the aud claim of a JWT Access Token
 */
export class SolidAudienceRequestHandler extends HttpHandler {
/**
 * Creates a {SolidAudienceRequestHandler} passing requests through the given handler.
 *
 * @param {HttpHandler} handler - the handler through which to pass incoming requests.
 * @param {string} pathToJwks - the path to a json file containing jwks.
 * @param {string} proxyUrl - the url of the upstream server.
 */
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

  /**
   * Passes the context's incoming request to the nested handler.
   * It then handles the response. If the response is a 200 response it adds
   * the string 'solid' to the aud claim of the Access Token.
   * Otherwise it returns an error response.
   *
   * @param {HttpHandlerContext} context
   */
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
      // creates a claim extended token
      switchMap((response) => zip(of(response), this.createClaimExtendedToken(response.body))),
      // creates a response including the new access token
      switchMap(([ response, token ]) => this.createAccessTokenResponse(
        response,
        token,
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
    switchMap<Buffer, JWK>((keyFile) => of(JSON.parse(keyFile.toString()).keys[0])),    // I would like to see some safer way than casting after a read
    switchMap((jwk) => zip(of(jwk.alg), of(jwk.kid), from(parseJwk(jwk)))),
  );

  private signJwtPayload = (jwtPayload: JWTPayload) => zip(of(jwtPayload), this.getSigningKit()).pipe(
    switchMap(([ payload, [ alg, kid, key ] ]) => from(
      new SignJWT(payload)
        .setProtectedHeader({ alg, kid, typ: 'at+jwt'  })
        .setIssuer(this.proxyUrl)
        .sign(key),
    )),
  );

  private createClaimExtendedToken(responseBody: string): Observable<string> {
    const parsedBody = JSON.parse(responseBody);
    // split the access token into header, payload, and footer parts, then get the payload
    const accessTokenPayload = parsedBody.access_token.split('.')[1];
    // base64url decode the access token payload
    const decodedAccessTokenPayload = JSON.parse(decode(accessTokenPayload).toString());
    // set the aud claim
    if (Array.isArray(decodedAccessTokenPayload.aud) && !decodedAccessTokenPayload.aud.includes('solid')) {
      decodedAccessTokenPayload.aud.push('solid');
    } else {
      decodedAccessTokenPayload.aud = [ decodedAccessTokenPayload.aud, 'solid' ];
    }

    return this.signJwtPayload(decodedAccessTokenPayload);
  }

  private createAccessTokenResponse(
    response: HttpHandlerResponse,
    claimExtendedAccessToken: string,
    corsOrigin: string,
  ) {
    const parsedBody = JSON.parse(response.body);
    parsedBody.access_token = claimExtendedAccessToken;
    return of({
      body: JSON.stringify(parsedBody),
      headers: {
        'access-control-allow-origin': corsOrigin,
        'Content-Type':  'application/json',
      },
      status: 200,
    });
  }

  /**
   * Returns true if the context is valid.
   * Returns false if the context, it's request, or the request's method, headers, or url are not included.
   *
   * @param {HttpHandlerContext} context
   */
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
