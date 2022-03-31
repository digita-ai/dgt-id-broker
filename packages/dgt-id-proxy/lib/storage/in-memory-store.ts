/**
 * MIT License
 *
 * Copyright (c) 2020 Solid Community
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import type { KeyValueStore } from './key-value-store';

/**
 * A { @link KeyValueStore } which uses a JavaScript Map for internal storage.
 * Warning: Uses a Map object, which internally uses `Object.is` for key equality,
 * so object keys have to be the same objects.
 */
export class InMemoryStore<K, V> implements KeyValueStore<K, V> {

  private readonly data: Map<K, V>;

  constructor() {

    this.data = new Map<K, V>();

  }

  async get(key: K): Promise<V | undefined> {

    return this.data.get(key);

  }

  async has(key: K): Promise<boolean> {

    return this.data.has(key);

  }

  async set(key: K, value: V): Promise<this> {

    this.data.set(key, value);

    return this;

  }

  async delete(key: K): Promise<boolean> {

    return this.data.delete(key);

  }

  async* entries(): AsyncIterableIterator<[K, V]> {

    for (const entry of this.data.entries()) {

      yield entry;

    }

  }

}
