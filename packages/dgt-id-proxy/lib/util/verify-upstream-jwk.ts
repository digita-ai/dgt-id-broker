import { base64url, JWK, importJWK, jwtVerify, JWTVerifyResult } from 'jose';
import { throwError, from, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { getLogger } from '@digita-ai/handlersjs-logging';

const logger = getLogger();

export const verifyUpstreamJwk = (token: string, upstreamUrl: string): Observable<JWTVerifyResult> => {

  if (!token){

    logger.verbose('No token provided', token);

    return throwError(() => new Error('token must be defined'));

  }

  if (!upstreamUrl) {

    logger.verbose('No upstreamUrl provided', upstreamUrl);

    return throwError(() => new Error('upstreamUrl must be defined'));

  }

  try {

    new URL(upstreamUrl);

  } catch (error) {

    logger.warn('the upstream url provided is not a valid URL', upstreamUrl);

    return throwError(() => new Error('upstreamUrl is not a valid URL'));

  }

  const splitToken = token.split('.');

  if (splitToken.length < 3) {

    logger.warn('the token provided is not a valid JWT, length is below 3', splitToken);

    return throwError(() => new Error('token is not a valid JWT'));

  }

  const decodedHeader = JSON.parse(base64url.decode(splitToken[0]).toString());

  if (!decodedHeader.kid) {

    logger.warn('the token provided is not a valid JWT, no kid found', decodedHeader);

    return throwError(() => new Error('Given token does not contain a key-id to verify'));

  }

  if (!decodedHeader.alg || decodedHeader.alg === 'none') {

    logger.warn('the token provided is not a valid JWT, no alg found', decodedHeader);

    return throwError(() => new Error('Token did not contain an alg, and is therefore invalid'));

  }

  return from(fetch(new URL('/.well-known/openid-configuration', upstreamUrl).href)).pipe(
    switchMap((response) => response.status === 200 ? from(response.json()) : throwError(() => new Error('There was a problem fetching upstream config'))),
    switchMap((data) => from(fetch(data.jwks_uri))),
    switchMap((response) => response.status === 200 ? from(response.json()) : throwError(() => new Error('There was a problem fetching upstream jwks'))),
    map((jwks) => jwks.keys.find((key: JWK) => key.kid === decodedHeader.kid)),
    switchMap((jwk) => {

      if (!jwk) {

        logger.warn('the token provided is not a valid JWT, no jwk with that id was found', decodedHeader);

        return throwError(() => new Error('No JWK with that ID was found'));

      }

      return from(importJWK(jwk, decodedHeader.alg));

    }),
    switchMap((jwkAsKeyLike) => from(jwtVerify(token, jwkAsKeyLike))),
  );

};

