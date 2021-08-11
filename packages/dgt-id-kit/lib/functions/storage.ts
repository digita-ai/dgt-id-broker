import { MemoryStore } from '@digita-ai/handlersjs-core';
import { JWK, KeyLike } from 'jose/webcrypto/types';

interface storeInterface  {
  privateKey: KeyLike;
  publicKey: JWK;
}

export const store = new MemoryStore<storeInterface>();
