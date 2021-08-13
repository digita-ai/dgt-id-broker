import { MemoryStore } from '@digita-ai/handlersjs-core';
import { JWK } from 'jose/webcrypto/types';

interface storeInterface  {
  privateKey: JWK;
  publicKey: JWK;
}

export const store = new MemoryStore<storeInterface>();
