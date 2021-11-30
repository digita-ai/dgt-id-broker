import { decode } from 'jose/util/base64url';
import { throwError, from, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { JWK, parseJwk } from 'jose/jwk/parse';
import { jwtVerify, JWTVerifyResult } from 'jose/jwt/verify';

/**
 * Checks if all necessary headers are present.
 * Fetches the openid configuration and retrieves the jwks_uri.
 * It then compares the kid header from the token with the kid header from the JWK keys to see if they match
 * and parses the JWK with the algorithm provided into a key and then verifies the token signature with said key.
 *
 * @param { string } token - The token to verify.
 * @param { string } upstreamUrl - The URL of the upstream endpoint.
 * @returns Confirms if the JWT is verified or not.
 */
export const verifyUpstreamJwk = (token: string, upstreamUrl: string): Observable<JWTVerifyResult> => {

  if (!token){

    return throwError(() => new Error('token must be defined'));

  }

  if (!upstreamUrl) {

    return throwError(() => new Error('upstreamUrl must be defined'));

  }

  try {

    new URL(upstreamUrl);

  } catch (error) {

    return throwError(() => new Error('upstreamUrl is not a valid URL'));

  }

  const splitToken = token.split('.');

  if (splitToken.length < 3) {

    return throwError(() => new Error('token is not a valid JWT'));

  }

  const decodedHeader = JSON.parse(decode(splitToken[0]).toString());

  if (!decodedHeader.kid) {

    return throwError(() => new Error('Given token does not contain a key-id to verify'));

  }

  if (!decodedHeader.alg || decodedHeader.alg === 'none') {

    return throwError(() => new Error('Token did not contain an alg, and is therefore invalid'));

  }

  return from(fetch(new URL('/.well-known/openid-configuration', upstreamUrl).href)).pipe(
    switchMap((response) => response.status === 200 ? from(response.json()) : throwError(() => new Error('There was a problem fetching upstream config'))),
    switchMap((data) => from(fetch(data.jwks_uri))),
    switchMap((response) => response.status === 200 ? from(response.json()) : throwError(() => new Error('There was a problem fetching upstream jwks'))),
    map((jwks) => jwks.keys.find((key: JWK) => key.kid === decodedHeader.kid)),
    switchMap((jwk) => {

      if (!jwk) {

        return throwError(() => new Error('No JWK with that ID was found'));

      }

      return from(parseJwk(jwk, decodedHeader.alg));

    }),
    switchMap((jwkAsKeyLike) => from(jwtVerify(token, jwkAsKeyLike))),
  );

};

