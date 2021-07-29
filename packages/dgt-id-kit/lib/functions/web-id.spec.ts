import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { plainProfile, issuer1, issuer2, requestUrl, profileWithIssuers, profileWithIssuersQuads, profileWithNoIssuers, profileWithNoIssuersQuads, profileInvalid, plainProfileQuads } from './web-id-test-data';
import { getFirstIssuerFromQuads, getFirstIssuerFromWebId, getIssuersFromQuads, getIssuersFromWebId, getWebIdProfile } from './web-id';

enableFetchMocks();

beforeEach(() => {

  fetchMock.resetMocks();

});

describe('getWebIdProfile()', () => {

  it('should return all quads for a persons profile', async () => {

    fetchMock.mockResponseOnce(plainProfile, { status: 200 });
    const result = getWebIdProfile(requestUrl);
    await expect(result).resolves.toHaveLength(4);
    await expect(result).resolves.toEqual(plainProfileQuads);

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

    fetchMock.mockResponseOnce(profileInvalid, { status: 200 });
    const result = getWebIdProfile(requestUrl);
    await expect(result).rejects.toThrow('No valid profile found for WebID: ');

  });

});

describe('getIssuersFromQuads()', () => {

  it('should return all issuer objects from a list of quads', async () => {

    const result = getIssuersFromQuads(profileWithIssuersQuads);
    await expect(result).resolves.toEqual([ issuer1, issuer2 ]);

  });

  it('should throw when the quads parameter is undefined', async () => {

    const result = getIssuersFromQuads(undefined);
    await expect(result).rejects.toThrow('Parameter "quads" should be defined!');

  });

  it('should return an empty list when no issuer was found', async () => {

    const result = getIssuersFromQuads(profileWithNoIssuersQuads);
    await expect(result).resolves.toEqual([]);

  });

});

describe('getFirstIssuerFromQuads()', () => {

  it('should return the first issuer object from a list of quads', async () => {

    const result = getFirstIssuerFromQuads(profileWithIssuersQuads);
    await expect(result).resolves.toEqual(issuer1);

  });

  it('should throw when the quads parameter is undefined', async () => {

    const result = getFirstIssuerFromQuads(undefined);
    await expect(result).rejects.toThrow('Parameter "quads" should be defined!');

  });

  it('should return undefined when no issuer was found', async () => {

    const result = getFirstIssuerFromQuads(profileWithNoIssuersQuads);
    await expect(result).resolves.toBe(undefined);

  });

});

describe('getIssuersFromWebId()', () => {

  it('should return all issuer objects from a profile', async () => {

    fetchMock.mockResponseOnce(profileWithIssuers, { status: 200 });
    const result = getIssuersFromWebId(requestUrl);
    await expect(result).resolves.toEqual([ issuer1, issuer2 ]);

  });

  it('should throw when the webid parameter is undefined', async () => {

    const result = getIssuersFromWebId(undefined);
    await expect(result).rejects.toThrow('Parameter "webid" should be defined!');

  });

  it('should return an empty list when no issuer was found', async () => {

    fetchMock.mockResponseOnce(profileWithNoIssuers, { status: 200 });
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

    fetchMock.mockResponseOnce(profileWithIssuers, { status: 200 });
    const result = getFirstIssuerFromWebId(requestUrl);
    await expect(result).resolves.toEqual(issuer1);

  });

  it('should throw when the webid parameter is undefined', async () => {

    const result = getFirstIssuerFromWebId(undefined);
    await expect(result).rejects.toThrow('Parameter "webid" should be defined!');

  });

  it('should return undefined when no issuer was found', async () => {

    fetchMock.mockResponseOnce(profileWithNoIssuers, { status: 200 });
    const result = getFirstIssuerFromWebId(requestUrl);
    await expect(result).resolves.toBe(undefined);

  });

  it('should throw an error when something goes wrong', async () => {

    fetchMock.mockRejectedValueOnce(undefined);
    const result = getFirstIssuerFromWebId(requestUrl);
    await expect(result).rejects.toThrow(`Something went wrong getting the issuer for webId "${requestUrl.toString()}"`);

  });

});
