import { HttpMethod } from '@digita-ai/handlersjs-http';
import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { mockedResponseValidSolidOidc, mockedResponseWithoutAuthEndpoint, validSolidOidcObject } from '../../test/test-data';
import { constructAuthRequestUrl, authRequest, tokenRequest, refreshTokenRequest, accessResource } from './oidc';

enableFetchMocks();

beforeEach(() => {

  fetchMock.mockClear();

});

const issuer = 'http://issuer.com';
const clientId = 'clientId';
const pkceCodeChallenge = 'pkceCodeChallenge';
const responseType = 'responseType';
const scope = 'scope';
const redirectUri = 'redirectUri';
const offlineAccess = false;
const authorizationCode = 'authorizationCode';
const refreshToken = 'refreshToken';
const resource = 'http://resource.com';
const method = 'GET';

describe('constructAuthRequestUrl()', () => {

  it('should return the constructed authentication request url', async () => {

    fetchMock.mockResponseOnce(mockedResponseValidSolidOidc);

    const result = constructAuthRequestUrl(
      issuer,
      clientId,
      pkceCodeChallenge,
      responseType,
      scope,
      redirectUri,
    );

    await expect(result).resolves.toContain(`${validSolidOidcObject.authorization_endpoint}?`);
    await expect(result).resolves.toContain(`client_id=${clientId}`);
    await expect(result).resolves.toContain(`code_challenge=${pkceCodeChallenge}`);
    await expect(result).resolves.toContain(`code_challenge_method=S256`);
    await expect(result).resolves.toContain(`response_type=${responseType}`);
    await expect(result).resolves.toContain(`scope=${scope}`);
    await expect(result).resolves.toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);

  });

  const constructAuthResuestUrlParams = { issuer, clientId, pkceCodeChallenge, responseType, scope, redirectUri };

  it.each(Object.keys(constructAuthResuestUrlParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...constructAuthResuestUrlParams };
    testArgs[keyToBeNull] = undefined;

    const result = constructAuthRequestUrl(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.pkceCodeChallenge,
      testArgs.responseType,
      testArgs.scope,
      testArgs.redirectUri,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

  it('should throw when no authorization endpoint was found for the given issuer', async () => {

    fetchMock.mockResponseOnce(mockedResponseWithoutAuthEndpoint);

    const result = constructAuthRequestUrl(
      issuer,
      clientId,
      pkceCodeChallenge,
      responseType,
      scope,
      redirectUri,
    );

    await expect(result).rejects.toThrow(`No authorization endpoint was found for issuer ${issuer}`);

  });

});

describe('authRequest()', () => {

  const authRequestParams = { issuer, clientId, scope, responseType, offlineAccess };

  it.each(Object.keys(authRequestParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...authRequestParams };
    testArgs[keyToBeNull] = undefined;

    const result = authRequest(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.scope,
      testArgs.responseType,
      testArgs.offlineAccess,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('tokenRequest()', () => {

  const tokenRequestParams = { issuer, clientId, authorizationCode, redirectUri };

  it.each(Object.keys(tokenRequestParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...tokenRequestParams };
    testArgs[keyToBeNull] = undefined;

    const result = tokenRequest(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.authorizationCode,
      testArgs.redirectUri,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('refreshTokenRequest()', () => {

  const refreshTokenRequestParams = { issuer, clientId, refreshToken, scope };

  it.each(Object.keys(refreshTokenRequestParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...refreshTokenRequestParams };
    testArgs[keyToBeNull] = undefined;

    const result = refreshTokenRequest(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.refreshToken,
      testArgs.scope,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('accessResource()', () => {

  const accessResourceParams = { resource, method };

  it.each(Object.keys(accessResourceParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...accessResourceParams };
    testArgs[keyToBeNull] = undefined;

    const result = accessResource(
      testArgs.resource,
      testArgs.method as HttpMethod,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

