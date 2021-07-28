import { Quad_Object } from '@rdfjs/types';
import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { NamedNode, Parser } from 'n3';
import { getFirstIssuerFromQuads, getFirstIssuerFromWebId, getIssuersFromQuads, getIssuersFromWebId, getWebIdProfile } from './web-id';

enableFetchMocks();

describe('WebIdModule', () => {

  const requestUrl: URL = new URL('http://url.com');
  const issuer1 = { url: new URL('http://mock-issuer.com/') };
  const issuer2 = { url: new URL('http://mocked-issuer.com/') };

  const mockedResponseWithIssuers = `
    @prefix : <#>.
    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.

    :me
      solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
      solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
      solid:oidcIssuer <${issuer1.url.toString()}>;
      solid:oidcIssuer <${issuer2.url.toString()}>;
      foaf:name "HRlinkIT".
  `;

  const quadsWithIssuers = new Parser().parse(mockedResponseWithIssuers);

  const mockedResponseNoIssuers = `
    @prefix : <#>.
    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.

    :me
      solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
      solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
      foaf:name "HRlinkIT".
  `;

  const quadsNoIssuers = new Parser().parse(mockedResponseNoIssuers);

  beforeEach(() => {

    fetchMock.resetMocks();

  });

  describe('getWebIdProfile()', () => {

    it('should return all quads for a persons profile', async () => {

      const mockedResponse = `
        @prefix : <#>.
        @prefix foaf: <http://xmlns.com/foaf/0.1/>.

        :me
          foaf:name "HRlinkIT".
      `;

      fetchMock.mockResponseOnce(mockedResponse, { status: 200 });
      const result = getWebIdProfile(requestUrl);
      await expect(result).resolves.toHaveLength(1);
      const awaitedResult = await result;

      expect(awaitedResult[0].predicate).toEqual(new NamedNode('http://xmlns.com/foaf/0.1/name'));

      expect(awaitedResult[0].subject).toEqual(new NamedNode('#me'));

      expect(awaitedResult[0].termType).toEqual('Quad');

      expect(awaitedResult[0].object.value).toEqual('HRlinkIT');
      expect(awaitedResult[0].object.termType).toEqual('Literal');

    });

    it('should throw when webId does not exist', async () => {

      fetchMock.mockRejectedValueOnce(undefined);
      const result = getWebIdProfile(requestUrl);
      await expect(result).rejects.toThrow(`Something went wrong getting the profile for webId"${requestUrl.toString()}"`);

    });

    it('should throw when the webId parameter is undefined', async () => {

      const result = getWebIdProfile(undefined);
      await expect(result).rejects.toThrow('Parameter "webid" should be defined!');

    });

  });

  describe('getIssuersFromQuads()', () => {

    it('should return all issuer objects from a list of quads', async () => {

      const result = getIssuersFromQuads(quadsWithIssuers);
      await expect(result).resolves.toEqual([ issuer1, issuer2 ]);

    });

    it('should throw when the quads parameter is undefined', async () => {

      const result = getIssuersFromQuads(undefined);
      await expect(result).rejects.toThrow('Parameter "quads" should be defined!');

    });

    it('should return an empty list when no issuer was found', async () => {

      const result = getIssuersFromQuads(quadsNoIssuers);
      await expect(result).resolves.toEqual([]);

    });

  });

  describe('getFirstIssuerFromQuads()', () => {

    it('should return the first issuer object from a list of quads', async () => {

      const result = getFirstIssuerFromQuads(quadsWithIssuers);
      await expect(result).resolves.toEqual(issuer1);

    });

    it('should throw when the quads parameter is undefined', async () => {

      const result = getFirstIssuerFromQuads(undefined);
      await expect(result).rejects.toThrow('Parameter "quads" should be defined!');

    });

    it('should return undefined when no issuer was found', async () => {

      const result = getFirstIssuerFromQuads(quadsNoIssuers);
      await expect(result).resolves.toBe(undefined);

    });

  });

  describe('getIssuersFromWebId()', () => {

    it('should return all issuer objects from a profile', async () => {

      fetchMock.mockResponseOnce(mockedResponseWithIssuers, { status: 200 });
      const result = getIssuersFromWebId(requestUrl);
      await expect(result).resolves.toEqual([ issuer1, issuer2 ]);

    });

    it('should throw when the webid parameter is undefined', async () => {

      const result = getIssuersFromWebId(undefined);
      await expect(result).rejects.toThrow('Parameter "webid" should be defined!');

    });

    it('should return an empty list when no issuer was found', async () => {

      fetchMock.mockResponseOnce(mockedResponseNoIssuers, { status: 200 });
      const result = getIssuersFromWebId(requestUrl);
      await expect(result).resolves.toEqual([]);

    });

    it('should throw an error when something goes wrong', async () => {

      fetchMock.mockRejectedValueOnce(undefined);
      const result = getIssuersFromWebId(requestUrl);
      await expect(result).rejects.toThrow(`Something went wrong getting the issuer for webId "${requestUrl.toString()}"`);

    });

  });

  describe('getFirstIssuerFromWebId()', () => {

    it('should return the first issuer object from a profile', async () => {

      fetchMock.mockResponseOnce(mockedResponseWithIssuers, { status: 200 });
      const result = getFirstIssuerFromWebId(requestUrl);
      await expect(result).resolves.toEqual(issuer1);

    });

    it('should throw when the webid parameter is undefined', async () => {

      const result = getFirstIssuerFromWebId(undefined);
      await expect(result).rejects.toThrow('Parameter "webid" should be defined!');

    });

    it('should return undefined when no issuer was found', async () => {

      fetchMock.mockResponseOnce(mockedResponseNoIssuers, { status: 200 });
      const result = getFirstIssuerFromWebId(requestUrl);
      await expect(result).resolves.toBe(undefined);

    });

    it('should throw an error when something goes wrong', async () => {

      fetchMock.mockRejectedValueOnce(undefined);
      const result = getFirstIssuerFromWebId(requestUrl);
      await expect(result).rejects.toThrow(`Something went wrong getting the issuer for webId "${requestUrl.toString()}"`);

    });

  });

});
