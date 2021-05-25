// This file comes from https://github.com/panva/node-oidc-provider-example/tree/main/01-oidc-configured - all credit to Panva.
// This generates keys which we are used to sign the JWT Access and ID Tokens that the identity provider sends.
const fs = require('fs');
const path = require('path');
const jose = require('jose2');

const keystore = new jose.JWKS.KeyStore();

Promise.all([
  keystore.generate('RSA', 2048, { use: 'sig' }),
  keystore.generate('EC', 'P-256', { use: 'sig', alg: 'ES256' }),
  keystore.generate('OKP', 'Ed25519', { use: 'sig', alg: 'EdDSA' }),
]).then(() => {
  fs.writeFileSync(path.resolve('jwks.json'), JSON.stringify(keystore.toJWKS(true), null, 2));
});