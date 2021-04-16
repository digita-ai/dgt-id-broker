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
              kty: jwk.kty,
              use: jwk.use,
              key_ops: jwk.key_ops ? [ ...jwk.key_ops ] : undefined,
              kid: jwk.kid,
              alg: jwk.alg,
              crv: jwk.crv,
              e: jwk.e,
              n: jwk.n,
              x: jwk.x,
              x5c: jwk.x5c ? [ ...jwk.x5c ] : undefined,
              y: jwk.y,
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
