import { fromKeyLike } from 'jose/jwk/from_key_like';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { KeyGenerationAlgorithm } from '../models/key-generation-algorithm.model';
import { store } from './storage';

export const generateKeys = async (algorithm: KeyGenerationAlgorithm = 'ES256'): Promise<void> => {

  try {

    const keyPair = await generateKeyPair(algorithm);

    const privateKey = keyPair.privateKey;
    const publicKey = await fromKeyLike(keyPair.publicKey);

    await store.set('privateKey', privateKey);
    await store.set('publicKey', { publicKey, alg: algorithm });

  } catch (error: unknown) {

    throw new Error(`An error occurred while generating keys with algorithm ${algorithm}: ${error}`);

  }

};

// export const createDPoPProof = async (htu: string, htm: string): Promise<string> => {

//   console.log('createDPoPProof()');

//   return undefined;

// };
