import { MemoryStore } from '@digita-ai/handlersjs-core';
import { JWK } from 'jose/types';

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
