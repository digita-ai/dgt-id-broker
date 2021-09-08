import { TypedKeyValueStore } from './typed-key-value-store.model';

/**
 * A {@link TypedKeyValueStore} which uses a JavaScript Map for internal storage.
 *
 * @inheritdoc
 */
export class LocalStorageStore<M> implements TypedKeyValueStore<M> {

  constructor() {

    if (!localStorage.getItem('localStorageStore')) localStorage.setItem('localStorageStore', JSON.stringify({}));

  }

  async get<T extends keyof M>(key: T): Promise<M[T] | undefined> {

    const localStorageStoreString = localStorage.getItem('localStorageStore');

    const localStorageStore = localStorageStoreString ? JSON.parse(localStorageStoreString) : undefined;

    return localStorageStore ? localStorageStore[key] : undefined;

  }

  async has<T extends keyof M>(key: T): Promise<boolean> {

    const localStorageStoreString = localStorage.getItem('localStorageStore');

    const localStorageStore = localStorageStoreString ? JSON.parse(localStorageStoreString) : undefined;

    return localStorageStore ? localStorageStore[key] !== undefined : false;

  }

  async set<T extends keyof M>(key: T, value: M[T]): Promise<this> {

    const localStorageStoreString = localStorage.getItem('localStorageStore');

    const localStorageStore = localStorageStoreString ? JSON.parse(localStorageStoreString) : undefined;

    localStorageStore[key] = value;

    localStorage.setItem('localStorageStore', JSON.stringify(localStorageStore));

    return this;

  }

  async delete<T extends keyof M>(key: T): Promise<boolean> {

    const localStorageStoreString = localStorage.getItem('localStorageStore');

    const localStorageStore = localStorageStoreString ? JSON.parse(localStorageStoreString) : undefined;

    localStorageStore[key] = undefined;

    return this.has(key);

  }

  // eslint-disable-next-line require-yield
  async* entries(): AsyncIterableIterator<[keyof M, M[keyof M]]> {

    throw new Error('Not Implemented');

  }

}
