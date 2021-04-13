import type { KeyValueStore } from './key-value-store';

/**
 * A {@link KeyValueStore} which uses a JavaScript Map for internal storage.
 * Warning: Uses a Map object, which internally uses `Object.is` for key equality,
 * so object keys have to be the same objects.
 */
export class InMemoryStore<TKey, TValue> implements KeyValueStore<TKey, TValue> {
  private readonly data: Map<TKey, TValue>;

  constructor() {
    this.data = new Map<TKey, TValue>();
  }

  async get(key: TKey): Promise<TValue | undefined> {
    return this.data.get(key);
  }

  async has(key: TKey): Promise<boolean> {
    return this.data.has(key);
  }

  async set(key: TKey, value: TValue): Promise<this> {
    this.data.set(key, value);
    return this;
  }

  async delete(key: TKey): Promise<boolean> {
    return this.data.delete(key);
  }

  async* entries(): AsyncIterableIterator<[TKey, TValue]> {
    for (const entry of this.data.entries()) {
      yield entry;
    }
  }
}
