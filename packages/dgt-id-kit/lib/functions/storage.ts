import { MemoryStore } from '@digita-ai/handlersjs-core';
import { JWK } from 'jose/types';

/**
 * An interface that represents a MemoryStore that can be used to tokens, keys and client information.
 */
interface storeInterface  {
  privateKey: JWK;
  publicKey: JWK;
  codeVerifier: string;

  accessToken: string;
  idToken: string;
  refreshToken: string;

  issuer: string;
  clientId: string;
  clientSecret: string;
}

export const store = new MemoryStore<storeInterface>();
