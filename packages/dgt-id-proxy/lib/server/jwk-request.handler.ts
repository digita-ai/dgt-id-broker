import { join } from 'path';
import { readFile } from 'fs/promises';
import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { from, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { JWK, parseJwk } from 'jose/jwk/parse';

/**
 * A {JwkRequestHandler} reading JWK keys from a file and returning them as a response for the jwk_uri endpoint.
 */
export class JwkRequestHandler extends HttpHandler {
  /**
   * Creates a { JwkRequestHandler } that returns a json response of the JWK keys from the file in the given path.
   *
   * @param {string} path - the relative path to the file containing JWK keys.
   */
  constructor(private path: string) {
    super();
  }

  handle(context: HttpHandlerContext) {

    return of({ path: join(process.cwd(), this.path) })
      .pipe(
        switchMap((data) => from(readFile(data.path))),
        map((file) => JSON.parse(file.toString())),
        switchMap((jwks) => {
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

  canHandle(context: HttpHandlerContext) {
    return of(true);
  }
}