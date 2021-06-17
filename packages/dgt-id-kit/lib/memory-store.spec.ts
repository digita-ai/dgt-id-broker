import { MemoryStore } from './memory-store';
import { Resource } from './models/resource.model';

describe('MemoryStore', () => {

  const resource1: Resource = { uri: 'collection-uri-1' };
  const resource2: Resource = { uri: 'collection-uri-2' };
  const resource3: Resource = { uri: 'collection-uri-3' };

  const resource2Updated: Resource = { uri: 'collection-uri-2' };

  const resources: Resource[] = [ resource1, resource2 ];

  let service: MemoryStore<Resource>;

  beforeEach(async () => {

    service = new MemoryStore(resources);

  });

  it('should be correctly instantiated', () => {

    expect(service).toBeTruthy();

  });

  describe('all', () => {

    it('should return all resources', () => {

      expect(service.all()).resolves.toEqual(resources);

    });

    it('should throw error when resources is null', () => {

      service = new MemoryStore(null);
      expect(service.all()).rejects.toThrow('Argument this.resources should be set.');

    });

  });

  describe('delete', () => {

    it('should delete an existing resource', async () => {

      const deletedResource = await service.delete(resource1);

      expect(deletedResource).toEqual(resource1);

      const remainingResources = await service.all();

      expect(remainingResources).toEqual([ resource2 ]);

    });

    it('should not delete a non-existing resource', async () => {

      const deletedResource = await service.delete(resource3);

      expect(deletedResource).toEqual(resource3);

      const remainingResources = await service.all();

      expect(remainingResources).toEqual([ resource1, resource2 ]);

    });

    it('should throw an error when no resource is given', () => {

      expect(service.delete(null)).rejects.toThrow('qrgument resource should be set.');

    });

    it('should throw an error when no resources are set', () => {

      service = new MemoryStore(null);

      expect(service.delete(resource1)).rejects.toThrow('Argument this.resources should be set.');

    });

  });

  describe('save', () => {

    it('should not add an existing resource', async () => {

      const savedResource = await service.save(resource1);

      expect(savedResource).toEqual(resource1);

      const remainingResources = await service.all();

      expect(remainingResources).toEqual([ resource2, resource1 ]);

    });

    it('should add a non-existing resource', async () => {

      const savedResource = await service.save(resource3);

      expect(savedResource).toEqual(resource3);

      const remainingResources = await service.all();

      expect(remainingResources).toEqual([ resource1, resource2, resource3 ]);

    });

    it('should add a non-existing resource without uri', async () => {

      const collectionToSave = { ...resource3, uri: null };

      const savedResource = await service.save(collectionToSave);

      expect(savedResource.uri).toBeTruthy();

      const remainingResources = await service.all();

      expect(remainingResources.length).toBe(3);

    });

    it('should update an existing resource', async () => {

      const savedResource = await service.save(resource2Updated);

      expect(savedResource).toEqual(resource2Updated);

      const remainingResources = await service.all();

      expect(remainingResources).toEqual([ resource1, resource2Updated ]);

    });

    it('should throw an error when no resource is given', () => {

      expect(service.save(null)).rejects.toThrow('Argument resource should be set.');

    });

    it('should throw an error when no resources are set', () => {

      service = new MemoryStore(null);

      expect(service.save(resource1)).rejects.toThrow('Argument this.resources should be set.');

    });

  });

  describe('get', () => {

    it('should return the right resource', () => {

      expect(service.get(resource2.uri)).resolves.toEqual(resource2);

    });

    it('should throw when uri is null', () => {

      expect(service.get(null)).rejects.toThrow('Argument uri should be set.');

    });

  });

});
