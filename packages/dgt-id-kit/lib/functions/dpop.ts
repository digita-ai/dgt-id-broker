import { fromKeyLike } from 'jose/jwk/from_key_like';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { SignJWT } from 'jose/jwt/sign';
import { v4 } from 'uuid';
import { parseJwk } from 'jose/jwk/parse';
import { KeyGenerationAlgorithm } from '../models/key-generation-algorithm.model';
import { store } from './storage';

export const generateKeys = async (algorithm: KeyGenerationAlgorithm = 'ES256'): Promise<void> => {

  try {

    const keyPair = await generateKeyPair(algorithm);

    const privateKey = await fromKeyLike(keyPair.privateKey);
    const publicKey = await fromKeyLike(keyPair.publicKey);

    await store.set('privateKey', privateKey);
    await store.set('publicKey', { ...publicKey, alg: algorithm });

  } catch (error: unknown) {

    throw new Error(`An error occurred while generating keys with algorithm ${algorithm}: ${error}`);

  }

};

export const createDPoPProof = async (htm: string, htu: string): Promise<string> => {

  if (!htm) { throw new Error('Parameter "htm" should be set'); }

  if (!htu) { throw new Error('Parameter "htu" should be set'); }

  const privateKey = await store.get('privateKey');

  if (!privateKey) { throw new Error('No private key was found in the store, call generateKeys()'); }

  const publicKey = await store.get('publicKey');

  if (!publicKey) { throw new Error('No public key was found in the store, call generateKeys()'); }

  try {

    return await new SignJWT({ htm, htu })
      .setProtectedHeader({
        alg: publicKey.alg,
        typ: 'dpop+jwt',
        jwk: publicKey,
      })
      .setJti(v4())
      .setIssuedAt()
      .sign(await parseJwk(privateKey, publicKey.alg));

  } catch (error: unknown) {

    throw new Error(`An error occurred while creating a DPoP proof: ${error}`);

  }

};
