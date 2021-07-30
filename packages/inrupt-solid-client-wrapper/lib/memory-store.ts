import { v4 } from 'uuid';
import { Resource } from './models/resource.model';
import { Store } from './models/store.model';

/**
 * An implementation of a generic store which stores resources in-memory. Useful for mocking.
 */
export class MemoryStore<T extends Resource> implements Store<T> {

  /**
   * Instantiates a memory store.
   *
   * @param resources An array of resources to initially populate the store.
   */
  constructor(protected resources: T[]) { }

  /**
   * Returns all resources stored in-memory.
   *
   * @returns All resources stores in-memory.
   */
  async all(): Promise<T[]> {

    if (!this.resources) {

      throw new Error('Argument this.resources should be set.');

    }

    return this.resources;

  }

  /**
   * Deletes the given resource.
   *
   * @param resource Resource to be deleted.
   */
  async delete(resource: T): Promise<T> {

    if (!this.resources) {

      throw new Error('Argument this.resources should be set.');

    }

    if (!resource) {

      throw new Error('Argument resource should be set.');

    }

    this.resources = this.resources.filter((existingResource) => resource.uri !== existingResource.uri);

    return resource;

  }

  /**
   * Either creates or updates the given resource.
   *
   * @param resource Resource to be saved.
   */
  async save(resource: T): Promise<T> {

    if (!this.resources) {

      throw new Error('Argument this.resources should be set.');

    }

    if (!resource) {

      throw new Error('Argument resource should be set.');

    }

    const resourceToSave: T = {
      ...resource,
      ...resource.uri ? {} : { uri: v4() },
    };

    this.resources = [
      ...this.resources.filter((existingResource) => resourceToSave.uri !== existingResource.uri),
      resourceToSave,
    ];

    return resourceToSave;

  }

  /**
   * Get a resource by its uri
   *
   * @param uri uri of the resource
   */
  async get(uri: string): Promise<T | undefined> {

    if (!uri) {

      throw new Error('Argument uri should be set.');

    }

    return this.resources.find((res) => res.uri === uri);

  }

}
