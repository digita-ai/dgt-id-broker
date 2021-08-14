// Fix to be able to run tests in jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { HttpMethod } from '@digita-ai/handlersjs-http';
import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { mockedResponseValidSolidOidc, mockedResponseWithoutEndpoints, validSolidOidcObject } from '../../test/test-data';
import { constructAuthRequestUrl, authRequest, tokenRequest, refreshTokenRequest, accessResource } from './oidc';
import { store } from './storage';

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

    fetchMock.mockResponseOnce(mockedResponseWithoutEndpoints);

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

  it('should perform a fetch request to the desired url', async () => {

    fetchMock.mockResponses(
      [ mockedResponseValidSolidOidc, { status: 200 } ],
      [ 'Does not matter', { status: 200 } ]
    );

    await authRequest(issuer, clientId, scope, responseType, offlineAccess);
    const requestedUrl = fetchMock.mock.calls[1][0];

    expect(requestedUrl).toBeDefined();
    expect(requestedUrl).toContain(`${validSolidOidcObject.authorization_endpoint}?`);
    expect(requestedUrl).toContain(`client_id=${clientId}`);
    expect(requestedUrl).toContain(`code_challenge=`);
    expect(requestedUrl).toContain(`code_challenge_method=S256`);
    expect(requestedUrl).toContain(`response_type=${responseType}`);
    expect(requestedUrl).toContain(`scope=${scope}`);
    expect(requestedUrl).toContain(`redirect_uri=`);

  });

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

  it('should perform a fetch request to the desired url', async () => {

    fetchMock.mockResponses(
      [ mockedResponseValidSolidOidc, { status: 200 } ],
      [ JSON.stringify({}), { status: 200 } ]
    );

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri);

    expect(fetchMock.mock.calls[1][0]).toBe(validSolidOidcObject.token_endpoint);

  });

  it('should save the tokens returned by the server to the store when they are present', async () => {

    fetchMock.mockResponses(
      [ mockedResponseValidSolidOidc, { status: 200 } ],
      [ JSON.stringify({ access_token: 'at', id_token: 'it', refresh_token: 'rt' }), { status: 200 } ]
    );

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri);

    await expect(store.has('accessToken')).resolves.toBe(true);
    await expect(store.get('accessToken')).resolves.toBe('at');
    await store.delete('accessToken');
    await expect(store.has('idToken')).resolves.toBe(true);
    await expect(store.get('idToken')).resolves.toBe('it');
    await store.delete('idToken');
    await expect(store.has('refreshToken')).resolves.toBe(true);
    await expect(store.get('refreshToken')).resolves.toBe('rt');
    await store.delete('refreshToken');

  });

  it('should not save the tokens (not) returned by the server to the store when they are not present', async () => {

    fetchMock.mockResponses(
      [ mockedResponseValidSolidOidc, { status: 200 } ],
      [ JSON.stringify({}), { status: 200 } ]
    );

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri);

    await expect(store.has('accessToken')).resolves.toBe(false);
    await expect(store.has('idToken')).resolves.toBe(false);
    await expect(store.has('refreshToken')).resolves.toBe(false);

  });

  it('should throw when no token endpoint was found for the given issuer', async () => {

    fetchMock.mockResponseOnce(mockedResponseWithoutEndpoints);

    const result = tokenRequest(
      issuer,
      clientId,
      authorizationCode,
      redirectUri,
    );

    await expect(result).rejects.toThrow(`No token endpoint was found for issuer ${issuer}`);

  });

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

