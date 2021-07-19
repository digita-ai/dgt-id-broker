import { Thing, getUrl, getSolidDataset, getThing, getThingAll, createThing, addUrl, setThing, saveSolidDatasetAt, fetch, overwriteFile, access } from '@digita-ai/inrupt-solid-client';
import { v4 } from 'uuid';
import { Resource } from './models/resource.model';
import { Store } from './models/store.model';

export class SolidStore<T extends Resource> implements Store<T> {

  async all(): Promise<T[]> {

    throw new Error('Method not implemented.');

  }
  async delete(resource: T): Promise<T> {

    throw new Error('Method not implemented.');

  }
  async save(resource: T): Promise<T> {

    throw new Error('Method not implemented.');

  }

  /**
   * Get a resource by its uri
   *
   * @param uri uri of the resource
   */
  async get(uri: string): Promise<T> {

    throw new Error('Method not implemented.');

  }

  /**
   * Returns the instance URI of a type registration for a given RDF class
   *
   * @param webId The WebID of the Solid pod
   * @param forClass The forClass value of the type registration
   */
  async getInstanceForClass(webId: string, forClass: string): Promise<string> {

    if (!webId) {

      throw new Error('Argument webId should be set.');

    }

    if (!forClass) {

      throw new Error('Argument forClass should be set.');

    }

    const profileDataset = await getSolidDataset(webId, { fetch });
    const profile = getThing(profileDataset, webId);

    if (!profile) {

      throw new Error(`Could not retrieve profile from dataset for webid ${webId}`);

    }

    const publicTypeIndexUrl = getUrl(profile, 'http://www.w3.org/ns/solid/terms#publicTypeIndex');

    if (!publicTypeIndexUrl) {

      throw new Error(`Could not retrieve type indexes from profile for webid ${webId}`);

    }

    const publicTypeIndexDataset = await getSolidDataset(publicTypeIndexUrl, { fetch });

    const typeRegistration = getThingAll(publicTypeIndexDataset).find((typeIndex: Thing) =>
      getUrl(typeIndex, 'http://www.w3.org/ns/solid/terms#forClass') === forClass);

    if (!typeRegistration) {

      throw new Error(`Could not retrieve type registrations for class ${forClass} from type index ${publicTypeIndexUrl}`);

    }

    const instance = getUrl(typeRegistration, 'http://www.w3.org/ns/solid/terms#instance');

    if (!instance) {

      throw new Error(`Could not retrieve instance for type registration ${typeRegistration}`);

    }

    return instance;

  }

  /**
   * Saves a new type registration
   *
   * @param webId The WebID of the Solid pod
   * @param forClass The `forClass` value of the type registration
   * @param instance The `instance` value of the type registration
   * @returns The saved instance URL, when successful
   */
  async saveInstanceForClass(webId: string, forClass: string, location: string): Promise<string> {

    if (!webId) {

      throw new Error('Argument webId should be set.');

    }

    if (!forClass) {

      throw new Error('Argument forClass should be set.');

    }

    if (!location) {

      throw new Error('Argument location should be set.');

    }

    const profileDataset = await getSolidDataset(webId);
    const profile = getThing(profileDataset, webId);

    if (!profile) {

      throw new Error(`Could not retrieve profile from dataset for webid ${webId}`);

    }

    const typeIndexUrl = getUrl(profile, 'http://www.w3.org/ns/solid/terms#publicTypeIndex') ?? (await this.createTypeIndexes(webId)).publicTypeIndex;

    const storage = getUrl(profile, 'http://www.w3.org/ns/pim/space#storage');

    if (!storage) {

      throw new Error(`Could not retrieve storage from profile of webid ${webId}`);

    }

    const instance =  new URL(location, storage).toString(); // https://leapeeters.be/ + /heritage-collections/catalog

    const publicTypeIndexDataset = await getSolidDataset(typeIndexUrl, { fetch });

    const typeRegistration = getThingAll(publicTypeIndexDataset).find((typeIndex: Thing) =>
      getUrl(typeIndex, 'http://www.w3.org/ns/solid/terms#forClass') === forClass &&
      getUrl(typeIndex, 'http://www.w3.org/ns/solid/terms#instance') === instance);

    if (typeRegistration) {

      return instance;

    } else {

      let registration = createThing({ url: `${typeIndexUrl}#${v4()}` });
      registration = addUrl(registration, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://www.w3.org/ns/solid/terms#TypeRegistration');
      registration = addUrl(registration, 'http://www.w3.org/ns/solid/terms#forClass', forClass);
      registration = addUrl(registration, 'http://www.w3.org/ns/solid/terms#instance', instance);
      const updatedDataset = setThing(publicTypeIndexDataset, registration);

      await saveSolidDatasetAt(typeIndexUrl, updatedDataset, { fetch });

    }

    return instance;

  }

  async createTypeIndexes(webId: string): Promise<{ privateTypeIndex: string; publicTypeIndex: string }> {

    if (!webId) {

      throw new Error('Argument webId should be set.');

    }

    const profileDataset = await getSolidDataset(webId);
    const profile = getThing(profileDataset, webId);

    if (!profile) {

      throw new Error(`Could not retrieve profile from dataset for webid ${webId}`);

    }

    // assuming profile does not include the
    // http://www.w3.org/ns/pim/space#storage triple ->
    // guess the root of the user's pod from the webId
    const webIdSplit = webId.split('profile/card#me');

    if (!webId.endsWith('profile/card#me') || webIdSplit.length < 2) {

      throw new Error(`Could not create type indexes for webid ${webId}`);

    }

    const privateTypeIndex = `${webIdSplit[0]}settings/privateTypeIndex.ttl`;
    const publicTypeIndex = `${webIdSplit[0]}settings/publicTypeIndex.ttl`;

    // create an empty type index files
    await overwriteFile(`${privateTypeIndex}`, new Blob([
      `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
      <>
        a solid:TypeIndex ;
        a solid:UnlistedDocument.`,
    ], { type: 'text/turtle' }), { fetch });

    await overwriteFile(`${publicTypeIndex}`, new Blob([
      `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
      <>
        a solid:TypeIndex ;
        a solid:ListedDocument.`,
    ], { type: 'text/turtle' }), { fetch });

    // add type index references to user profile
    const dataToAdd = [
      { property: 'http://www.w3.org/ns/solid/terms#privateTypeIndex', value: privateTypeIndex },
      { property: 'http://www.w3.org/ns/solid/terms#publicTypeIndex', value: publicTypeIndex },
      { property: 'http://www.w3.org/ns/pim/space#storage', value: webIdSplit[0] },
    ];

    const updatedDataset = setThing(
      profileDataset,
      dataToAdd.reduce((thing, newData) => addUrl(thing, newData.property, newData.value), profile)
    );

    await saveSolidDatasetAt(webId, updatedDataset, { fetch });

    // make public type index public
    await access.setPublicAccess(
      publicTypeIndex,
      { read: true },
      { fetch }
    );

    return { privateTypeIndex, publicTypeIndex };

  }

}
