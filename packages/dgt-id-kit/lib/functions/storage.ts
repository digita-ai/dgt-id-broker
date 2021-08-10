import clone from 'clone';
import { TypedKeyValueStore } from '@digita-ai/handlersjs-core';

/**
 * A {@link KeyValueStore} which uses a JavaScript Map for internal storage.
 *
 * @inheritdoc
 */
export class MemoryTypedKeyValueStore<M> implements TypedKeyValueStore<M> {

  private readonly data: Map<keyof M, M[keyof M]>;

  constructor(initialData?: [keyof M, M[keyof M]][]) {

    this.data = new Map(initialData);

  }

  async get<T extends keyof M>(key: T): Promise<M[T] | undefined> {

    return this.data.has(key) ? clone(this.data.get(key) as M[T]) : undefined;

  }

  async has<T extends keyof M>(key: T): Promise<boolean> {

    return this.data.has(key);

  }

  async set<T extends keyof M>(key: T, value: M[T]): Promise<this> {

    this.data.set(key, clone(value));

    return this;

  }

  async delete<T extends keyof M>(key: T): Promise<boolean> {

    return this.data.delete(key);

  }

  async* entries(): AsyncIterableIterator<[keyof M, M[keyof M]]> {

    for (const [ key, value ] of this.data.entries()) {

      yield [ key, clone(value) ];

    }

  }

}

export const store = new MemoryTypedKeyValueStore();
