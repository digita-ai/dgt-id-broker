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

/**
 * A simple storage solution that can be used for internal values that need to be stored.
 * In general storages taking objects as keys are expected to work with different instances
 * of an object with the same values. Exceptions to this expectation should be clearly documented.
 */
export interface KeyValueStore<K, V> {

  /**
   * Returns the value stored for the given identifier.
   * `undefined` if no value is stored.
   *
   * @param identifier - Identifier to get the value for.
   */
  get: (key: K) => Promise<V | undefined>;

  /**
   * Checks if there is a value stored for the given key.
   *
   * @param identifier - Identifier to check.
   */
  has: (key: K) => Promise<boolean>;

  /**
   * Sets the value for the given key.
   *
   * @param key - Key to set/update.
   * @param value - Value to store.
   *
   * @returns The storage.
   */
  set: (key: K, value: V) => Promise<this>;

  /**
   * Deletes the value stored for the given key.
   *
   * @param key - Key to delete.
   *
   * @returns If there was a value to delete.
   */
  delete: (key: K) => Promise<boolean>;

  /**
   * An iterable of entries in the storage.
   */
  entries: () => AsyncIterableIterator<[K, V]>;

}
