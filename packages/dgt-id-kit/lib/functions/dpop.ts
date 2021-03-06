import { exportJWK, generateKeyPair, SignJWT, importJWK, JWK } from 'jose';
import { v4 } from 'uuid';
import { KeyGenerationAlgorithm } from '../models/key-generation-algorithm.model';

export interface generateKeysReturnObject {
  privateKey: JWK;
  publicKey: JWK;
}

/**
 * Generate a private- and public key
 *
 * @param algorithm the desired algorithm to be used to generate the key pair
 * @returns an object containing the public and private key
 */
export const generateKeys = async (
  algorithm: KeyGenerationAlgorithm = 'ES256',
): Promise<generateKeysReturnObject> => {

  try {

    const keyPair = await generateKeyPair(algorithm, { extractable: true });

    const privateKey = await exportJWK(keyPair.privateKey);
    const publicKey = await exportJWK(keyPair.publicKey);

    return {
      privateKey,
      publicKey: { ...publicKey, alg: algorithm },
    };

  } catch (error: unknown) {

    throw new Error(`An error occurred while generating keys with algorithm ${algorithm}: ${error}`);

  }

};

/**
 * Creates a DPoP proof signed by the private key
 *
 * @param htm The HTTP method for the request to which the JWT is attached
 * @param htu The HTTP URI used for the request, without query and fragment parts
 * @param publicKey the public key
 * @param privateKey the private key
 * @returns DPoP proof string
 */
export const createDpopProof = async (
  htm: string,
  htu: string,
  publicKey: JWK,
  privateKey: JWK,
): Promise<string> => {

  if (!htm) throw new Error('Parameter "htm" should be set');
  if (!htu) throw new Error('Parameter "htu" should be set');
  if (!publicKey) throw new Error('Parameter "publicKey" should be set');
  if (!privateKey) throw new Error('Parameter "privateKey" should be set');
  if (!publicKey.alg) throw new Error('Parameter "publicKey.alg" should be set');

  try {

    const noHashHtu = htu.split('#')[0];

    return await new SignJWT({ htm, htu: noHashHtu })
      .setProtectedHeader({
        alg: publicKey.alg,
        typ: 'dpop+jwt',
        jwk: publicKey,
      })
      .setJti(v4())
      .setIssuedAt()
      .sign(await importJWK(privateKey, publicKey.alg));

  } catch (error: unknown) {

    throw new Error(`An error occurred while creating a DPoP proof: ${error}`);

  }

};
