import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { NamedNode, Parser } from 'n3';
import { Quad } from 'rdf-js';
import { getFirstIssuerFromQuads, getFirstIssuerFromWebId, getIssuersFromQuads, getIssuersFromWebId, getWebIdProfile } from './web-id';

enableFetchMocks();

beforeEach(() => {

  fetchMock.resetMocks();

});

const requestUrl = 'http://url.com';
const issuer1 = { url: new URL('http://mock-issuer.com/') };
const issuer2 = { url: new URL('http://mocked-issuer.com/') };

const mockedResponseWithIssuers = `
    @prefix : <#>.
    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.
    @prefix pro: <./>.

    pro:card a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.

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
    @prefix pro: <./>.

    pro:card a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.

    :me
      solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
      solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
      foaf:name "HRlinkIT".
  `;

const quadsNoIssuers = new Parser().parse(mockedResponseNoIssuers);

const mockedResponseInvalidProfile = `
    @prefix : <#>.
    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.

    :me
      solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
      solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
      foaf:name "HRlinkIT".
  `;

const mockedResponsePlainProfile = `
    @prefix : <#>.
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.
    @prefix pro: <./>.

    pro:card a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.

    :me
      foaf:name "HRlinkIT".
  `;

describe('getWebIdProfile()', () => {

  it('should return all quads for a persons profile', async () => {

    fetchMock.mockResponseOnce(mockedResponsePlainProfile, { status: 200 });
    const result = getWebIdProfile(requestUrl);
    await expect(result).resolves.toHaveLength(4);
    const awaitedResult = await result;
    const nameQuad = awaitedResult.find((quad: Quad) => quad.predicate.value === 'http://xmlns.com/foaf/0.1/name');

    expect(nameQuad).toBeDefined();

    expect(nameQuad.predicate).toEqual(new NamedNode('http://xmlns.com/foaf/0.1/name'));
    expect(nameQuad.subject).toEqual(new NamedNode('#me'));
    expect(nameQuad.termType).toEqual('Quad');
    expect(nameQuad.object.value).toEqual('HRlinkIT');
    expect(nameQuad.object.termType).toEqual('Literal');

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

  it('should throw when the url does not lead to a valid profile', async () => {

    fetchMock.mockResponseOnce(mockedResponseInvalidProfile, { status: 200 });
    const result = getWebIdProfile(requestUrl);
    await expect(result).rejects.toThrow('No valid profile found for WebID: ');

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
