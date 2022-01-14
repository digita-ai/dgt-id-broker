import { JWK } from 'jose';

export const privateToPublicJwk = (jwk: JWK): JWK => ({
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
});
