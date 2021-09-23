/* eslint-disable no-console -- is cli script */
/**
 * This script will generate an EC ES256 key and an RSA RS256 key
 * Usage: npm run generate:keys [-- [relative path to file (optional)]]
 */

import { writeFileSync } from 'fs';
import * as path from 'path';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { fromKeyLike } from 'jose/jwk/from_key_like';
import { v4 as uuid } from 'uuid';

const args = process.argv.slice(2);
const filePath = args[0] ?? '../../assets/jwks.json';

const generateKeys = async () => {

  const ecKey =  await generateKeyPair('ES256');
  const ecJwk = await fromKeyLike(ecKey.privateKey);
  ecJwk.kid = uuid();
  ecJwk.alg = 'ES256';
  ecJwk.use = 'sig';

  const rsaKey =  await generateKeyPair('RS256');
  const rsaJwk = await fromKeyLike(rsaKey.privateKey);
  rsaJwk.kid = uuid();
  rsaJwk.alg = 'RS256';
  rsaJwk.use = 'sig';

  const jwks = {
    'keys': [
      ecJwk,
      rsaJwk,
    ],
  };

  writeFileSync(path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath), JSON.stringify(jwks));

  console.log(`Successfully wrote the keys to "${path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)}"`);

};

generateKeys();
