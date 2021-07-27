import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { Parser } from 'n3';
import { getIssuerFromQuads, getIssuerFromWebId, getWebIdProfile } from './web-id';
enableFetchMocks();

describe('WebIdModule', () => {

  beforeEach(() => {

    fetchMock.resetMocks();

  });

  describe('getWebIdProfile()', () => {

    it('should return all quads for a persons profile', async () => {

      const mockedResponse = `
        @prefix : <#>.
        @prefix solid: <http://www.w3.org/ns/solid/terms#>.
        @prefix foaf: <http://xmlns.com/foaf/0.1/>.

        :me
          solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
          solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
          foaf:name "HRlinkIT".
      `;

      fetchMock.mockResponseOnce(mockedResponse, { status: 200 });

      const url = new URL('https://not.a.pod/profile/card#me');
      const result = getWebIdProfile(url);

      await expect(result).resolves.toHaveLength(3);

    });

    it('should throw when webId does not exist', async () => {

      fetchMock.mockRejectedValueOnce(undefined);
      const url = new URL('https://not.a.pod/profile/card#me');
      const result = getWebIdProfile(url);

      await expect(result).rejects.toThrow(`Something went wrong getting the profile for webId"${url.toString()}"`);

    });

    it('should throw when the webId parameter is undefined', async () => {

      const result = getWebIdProfile(undefined);
      await expect(result).rejects.toThrow('Parameter "webid" should be defined!');

    });

  });

  describe('getIssuerFromQuads()', () => {

    it('should return the issuer object from a list of quads', async () => {

      const issuer = { url: new URL('http://mock-issuer.com/') };

      const quads = new Parser().parse(`
        @prefix : <#>.
        @prefix solid: <http://www.w3.org/ns/solid/terms#>.
        @prefix foaf: <http://xmlns.com/foaf/0.1/>.

        :me
          solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
          solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
          solid:oidcIssuer <${issuer.url.toString()}>;
          foaf:name "HRlinkIT".
      `);

      const result = getIssuerFromQuads(quads);

      await expect(result).resolves.toEqual(issuer);

    });

    it('should throw when the quads parameter is undefined', async () => {

      const result = getIssuerFromQuads(undefined);
      await expect(result).rejects.toThrow('Parameter "quads" should be defined!');

    });

    it('should return undefined when no issuer was found', async () => {

      const quads = new Parser().parse(`
        @prefix : <#>.
        @prefix solid: <http://www.w3.org/ns/solid/terms#>.
        @prefix foaf: <http://xmlns.com/foaf/0.1/>.

        :me
          solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
          solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
          foaf:name "HRlinkIT".
      `);

      const result = getIssuerFromQuads(quads);

      await expect(result).resolves.toBe(undefined);

    });

  });

  describe('getIssuerFromWebId()', () => {

    it('should return the issuer object from a profile', async () => {

      const issuer = { url: new URL('http://mock-issuer.com/') };

      const mockedResponse = `
        @prefix : <#>.
        @prefix solid: <http://www.w3.org/ns/solid/terms#>.
        @prefix foaf: <http://xmlns.com/foaf/0.1/>.

        :me
          solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
          solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
          solid:oidcIssuer <${issuer.url.toString()}>;
          foaf:name "HRlinkIT".
      `;

      fetchMock.mockResponseOnce(mockedResponse, { status: 200 });

      const url = new URL('https://not.a.pod/profile/card#me');
      const result = getIssuerFromWebId(url);

      await expect(result).resolves.toEqual(issuer);

    });

    it('should throw when the webid parameter is undefined', async () => {

      const result = getIssuerFromWebId(undefined);
      await expect(result).rejects.toThrow('Parameter "webid" should be defined!');

    });

    it('should return undefined when no issuer was found', async () => {

      const mockedResponse = `
        @prefix : <#>.
        @prefix solid: <http://www.w3.org/ns/solid/terms#>.
        @prefix foaf: <http://xmlns.com/foaf/0.1/>.

        :me
          solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
          solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
          foaf:name "HRlinkIT".
      `;

      fetchMock.mockResponseOnce(mockedResponse, { status: 200 });

      const url = new URL('https://not.a.pod/profile/card#me');
      const result = getIssuerFromWebId(url);

      await expect(result).resolves.toBe(undefined);

    });

    it('should throw an error when something goes wrong', async () => {

      fetchMock.mockRejectedValueOnce(undefined);
      const url = new URL('https://not.a.pod/profile/card#me');
      const result = getIssuerFromWebId(url);

      await expect(result).rejects.toThrow(`Something went wrong getting the issuer for webId"${url.toString()}"`);

    });

  });

});
