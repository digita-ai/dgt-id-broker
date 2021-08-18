import { MemoryStore } from '@digita-ai/handlersjs-core';
import { JWK } from 'jose/webcrypto/types';

interface storeInterface  {
  privateKey: JWK;
  publicKey: JWK;
  codeVerifier: string;
}

export const store = new MemoryStore<storeInterface>();
