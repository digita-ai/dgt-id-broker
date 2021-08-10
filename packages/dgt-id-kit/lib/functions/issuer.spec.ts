import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { mockedResponseInvalidSolidOidc, mockedResponseValidSolidOidc, requestUrl, validSolidOidcObject } from '../../test/test-data';
import { getIssuerConfig, validateIssuer, getDiscoveryInfo, getEndpoint } from './issuer';

enableFetchMocks();

beforeEach(() => {

  fetchMock.resetMocks();

});

describe('getIssuerConfig()', () => {

  it('should return the config if it is present on the server', async () => {

    fetchMock.mockResponseOnce(mockedResponseValidSolidOidc, { status: 200 });
    const result = getIssuerConfig(requestUrl);
    await expect(result).resolves.toEqual(validSolidOidcObject);

  });

  it('should throw when issuer is undefined', async () => {

    const result = getIssuerConfig(undefined);
    await expect(result).rejects.toThrow('Parameter "issuer" should be set');

  });

  it('should throw when the issuer is not a valid url', async () => {

    const result = getIssuerConfig('notaurl');
    await expect(result).rejects.toThrow('Something went wrong retrieving the openid-configuration:');

  });

  it('should throw when the oidc configuration is not found', async () => {

    fetchMock.mockResponseOnce('Not Found', { status: 404 });
    const result = getIssuerConfig(requestUrl);
    await expect(result).rejects.toThrow('No openid-configuration was found on this url: ');

  });

});

describe('validateIssuer()', () => {

  it('should return true when the config is found and solid compliance is advertised', async () => {

    fetchMock.mockResponseOnce(mockedResponseValidSolidOidc, { status: 200 });
    const result = validateIssuer(requestUrl);
    await expect(result).resolves.toBe(true);

  });

  it('should return false when the config is found and solid compliance is not advertised', async () => {

    fetchMock.mockResponseOnce(mockedResponseInvalidSolidOidc, { status: 200 });
    const result = validateIssuer(requestUrl);
    await expect(result).resolves.toBe(false);

  });

  it('should return false when an error occurs', async () => {

    fetchMock.mockRejectedValueOnce(undefined);
    const result = validateIssuer(requestUrl);
    await expect(result).resolves.toBe(false);

  });

  it('should throw when parameter issuer is undefined', async () => {

    const result = validateIssuer(undefined);
    await expect(result).rejects.toThrow('Parameter "issuer" should be set');

  });

});

describe('getDiscoveryInfo()', () => {

  it('should return the correct value from the openid config', async () => {

    fetchMock.mockResponseOnce(mockedResponseValidSolidOidc);
    const result = getDiscoveryInfo(requestUrl, 'jwks_uri');
    await expect(result).resolves.toBe(validSolidOidcObject.jwks_uri);

  });

  it('should return undefined when the openid config does not contain the requested field', async () => {

    fetchMock.mockResponseOnce(mockedResponseInvalidSolidOidc);
    const result = getDiscoveryInfo(requestUrl, 'solid_oidc_supported');
    await expect(result).resolves.toBe(undefined);

  });

  it('should throw when parameter issuer is undefined', async () => {

    const result = getDiscoveryInfo(undefined, 'jwks_uri');
    await expect(result).rejects.toThrow('Parameter "issuer" should be set');

  });

  it('should throw when parameter field is undefined', async () => {

    const result = getDiscoveryInfo(requestUrl, undefined);
    await expect(result).rejects.toThrow('Parameter "field" should be set');

  });

  it('should throw when an error occurs', async () => {

    fetchMock.mockRejectedValueOnce(undefined);
    const result = getDiscoveryInfo(requestUrl, 'jwks_uri');
    await expect(result).rejects.toThrow('Something went wrong trying to get discoveryField: ');

  });

});

describe('getEndpoint()', () => {

  it('should return the correct value for the given endpoint', async () => {

    fetchMock.mockResponseOnce(mockedResponseValidSolidOidc);
    const result = getEndpoint(requestUrl, 'token_endpoint');
    await expect(result).resolves.toBe(validSolidOidcObject.token_endpoint);

  });

  it('should throw when parameter issuer is undefined', async () => {

    const result = getEndpoint(undefined, 'token_endpoint');
    await expect(result).rejects.toThrow('Parameter "issuer" should be set');

  });

  it('should throw when parameter endpoint is undefined', async () => {

    const result = getEndpoint(requestUrl, undefined);
    await expect(result).rejects.toThrow('Parameter "endpoint" should be set');

  });

  // it('should throw when parameter endpoint does not end in _endpoint', async () => {

  //   const result = getEndpoint(requestUrl, 'jwks_uri');
  //   await expect(result).rejects.toThrow('Parameter "endpoint" should end in "_endpoint"');

  // });

});
