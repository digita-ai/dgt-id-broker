import * as path from 'path';
import { readFile } from 'fs/promises';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, from, of, catchError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { JWK } from 'jose';
import { getLoggerFor } from '@digita-ai/handlersjs-logging';

/**
 * A {HttpHandler} reading JWK keys from a file and returning them as a response for the jwk_uri endpoint.
 */
export class JwkRequestHandler extends HttpHandler {

  private logger = getLoggerFor(this, 5, 5);

  /**
   * Creates a {JwkRequestHandler} that returns a json response of the JWK keys from the file in the given path.
   *
   * @param {string} jwkPath - the relative path to the file containing JWK keys.
   */
  constructor(private jwkPath: string) {

    super();

  }

  /**
   * Handles a request by reading the json file containing JWKs specified by path,
   * removing the private claims in the JWKs, and creating a response containing the public JWKs
   * in the body.
   *
   * @param {HttpHandlerContext} context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse>{

    const jwkPath = path.isAbsolute(this.jwkPath) ? this.jwkPath : path.join(process.cwd(), this.jwkPath);

    return from(readFile(jwkPath))
      .pipe(
        map((file) => JSON.parse(file.toString())),
        switchMap((jwks) => {

          this.logger.info('Creating JWKs for response', jwks);

          const jwksForResponse = {
            keys: jwks.keys.map((jwk: JWK) => ({
              kty: jwk.kty, // key type: defines thecryptographic algorithm family used with the key
              use: jwk.use, // The "use" parameter is employed to indicate whether a public key is used for encrypting data or verifying the signature on data.
              // The "key_ops" (key operations) parameter identifies the operation(s) for which the key is intended to be used
              key_ops: jwk.key_ops ? [ ...jwk.key_ops ] : undefined,
              kid: jwk.kid, // The "kid" (key ID) parameter is used to match a specific key.
              alg: jwk.alg, // The "key_ops" (key operations) parameter identifies the operation(s) for which the key is intended to be used
              crv: jwk.crv, // if key type is elliptical curve, defines the specific curve (ES256, p-256, RS256, etc.)
              e: jwk.e, // used by RSA key types
              n: jwk.n, // used by RSA key types
              x: jwk.x, // used by EC key types
              x5c: jwk.x5c ? [ ...jwk.x5c ] : undefined, // optional parameter. Read more: https://tools.ietf.org/html/rfc7517#section-4.7
              y: jwk.y, // used by EC key types
            })),
          };

          return of({
            body: JSON.stringify(jwksForResponse),
            headers: { 'Content-Type': 'application/jwk-set+json' },
            status: 200,
          });

        }),
      );

  }

  /**
   * Specifies that this handler can handle any context.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean>{

    this.logger.info('Checking canHandle', context);

    return of(true);

  }

}
