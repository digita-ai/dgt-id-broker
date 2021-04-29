import { readFile } from 'fs/promises';
import { join } from 'path';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { Observable, of, from, throwError, zip } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { decode } from 'jose/util/base64url';
import { JWK, JWTPayload } from 'jose/webcrypto/types';
import { SignJWT } from 'jose/jwt/sign';
import { parseJwk } from 'jose/jwk/parse';
import { v4 as uuid }  from 'uuid';

/**
 * A {HttpHandler} that handles Access Token requests for an upstream server that returns Opaque Access Tokens
 * by turning them into valid JSON Web Tokens
 */
export class OpaqueAccessTokenHandler extends HttpHandler {
  /**
   * Creates an {OpaqueAccessTokenHandler} passing requests through the given handler.
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
   * handles the context's incoming request. If the request is valid it is passed to the nested handler.
   * If the request's method is POST the response is transformed. The sub and aud claims from the id_token returned
   * by the upstream server are used to create a valid JWT Access Token.
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
      // creates a jwt access token from claims int he id token
      switchMap((response) => zip(of(response), this.createJwtAccessToken(response.body))),
      // create a response to replace the opaque access token with the jwt acces token
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

  private createJwtAccessToken(responseBody: string): Observable<string> {
    const parsedBody = JSON.parse(responseBody);
    // split the id token into header, payload, and footer parts, then get the payload
    const idTokenPayload = parsedBody.id_token.split('.')[1];
    // base64url decode the id token payload
    const decodedIdTokenPayload = JSON.parse(decode(idTokenPayload).toString());

    // get the sub and aud claims from the id token and add them to the accessTokenPayload
    const accessTokenPayload = {
      sub: decodedIdTokenPayload.sub,
      aud: decodedIdTokenPayload.aud,
    };

    // sign the token
    return this.signJwtPayload(accessTokenPayload);
  }

  private createAccessTokenResponse(
    response: HttpHandlerResponse,
    jwtAccessToken: string,
    corsOrigin: string,
  ) {
    const parsedBody = JSON.parse(response.body);
    parsedBody.access_token = jwtAccessToken;
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

