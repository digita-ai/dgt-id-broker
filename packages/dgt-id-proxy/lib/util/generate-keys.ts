// This script will generate an EC ES256 key and an RSA RS256 key

// usage: npm run generate-keys [-- [relative path to file (optional)]]

import { writeFileSync } from 'fs';
import { join } from 'path';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { fromKeyLike } from 'jose/jwk/from_key_like';
import { v4 as uuid } from 'uuid';

// get the arguments
const args = process.argv.slice(2);
let filePath = args[0];
if (!filePath) {
  // use this path by default if no filePath was provided
  filePath = 'assets/jwks.json';
}

const generateKeys = async () => {
  // generate an ES256 key
  const ecKey =  await generateKeyPair('ES256');
  // get the private key in JWK format
  const ecJwk = await fromKeyLike(ecKey.privateKey);
  // add missing claims
  ecJwk.kid = uuid();
  ecJwk.alg = 'ES256';
  ecJwk.use = 'sig';
  // generate an RS256 key
  const rsaKey =  await generateKeyPair('RS256');
  // get the private key in JWK format
  const rsaJwk = await fromKeyLike(rsaKey.privateKey);
  // add missing claims
  rsaJwk.kid = uuid();
  rsaJwk.alg = 'RS256';
  rsaJwk.use = 'sig';

  // create the format in which the jwks must be saved
  const jwks = {
    'keys': [
      ecJwk,
      rsaJwk,
    ],
  };
  // write the jwks to the given file
  writeFileSync(join(process.cwd(), filePath), JSON.stringify(jwks));
  // eslint-disable-next-line no-console
  console.log(`Successfully wrote the keys to "${join(process.cwd(), filePath)}"`);
};

generateKeys();
