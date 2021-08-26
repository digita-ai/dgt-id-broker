// Fix to be able to run tests in jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { HttpMethod } from '@digita-ai/handlersjs-http';
import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { dummyValidAccessToken, validSolidOidcObject } from '../../test/test-data';
import { constructAuthRequestUrl, authRequest, tokenRequest, refreshTokenRequest, accessResource } from './oidc';
import { store } from './storage';
import { generateKeys } from './dpop';
import * as issuerModule from './issuer';
import * as oidcModule from './oidc';

enableFetchMocks();

afterAll(() => {

  jest.clearAllMocks();

});

beforeEach(() => {

  fetchMock.mockClear();

  jest.spyOn(issuerModule, 'getEndpoint').mockImplementation(async (_issuer: string, endpoint: string): Promise<string> => {

    switch (endpoint) {

      case 'token_endpoint': return validSolidOidcObject.token_endpoint;
      case 'authorization_endpoint': return validSolidOidcObject.authorization_endpoint;
      default: return validSolidOidcObject.token_endpoint;

    }

  });

});

const issuer = 'http://issuer.com';
const clientId = 'clientId';
const pkceCodeChallenge = 'pkceCodeChallenge';
const scope = 'scopeopenid';
const redirectUri = 'redirectUri';
const authorizationCode = 'authorizationCode';
const refreshToken = 'refreshToken';
const resource = 'http://resource.com';
const method = 'GET';
const clientSecret = 'clientSecret';
const body = 'body';
const contentType = 'contentType';

describe('constructAuthRequestUrl()', () => {

  it('should return the constructed authentication request url', async () => {

    const result = constructAuthRequestUrl(
      issuer,
      clientId,
      pkceCodeChallenge,
      scope,
      redirectUri,
    );

    await expect(result).resolves.toContain(`${validSolidOidcObject.authorization_endpoint}?`);
    await expect(result).resolves.toContain(`client_id=${clientId}`);
    await expect(result).resolves.toContain(`code_challenge=${pkceCodeChallenge}`);
    await expect(result).resolves.toContain(`code_challenge_method=S256`);
    await expect(result).resolves.toContain(`response_type=code`);
    await expect(result).resolves.toContain(`scope=${scope}`);
    await expect(result).resolves.toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);

  });

  const constructAuthResuestUrlParams = { issuer, clientId, pkceCodeChallenge, scope, redirectUri };

  it.each(Object.keys(constructAuthResuestUrlParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...constructAuthResuestUrlParams };
    testArgs[keyToBeNull] = undefined;

    const result = constructAuthRequestUrl(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.pkceCodeChallenge,
      testArgs.scope,
      testArgs.redirectUri,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

  it('should throw when no authorization endpoint was found for the given issuer', async () => {

    jest.spyOn(issuerModule, 'getEndpoint').mockResolvedValueOnce(undefined);

    const result = constructAuthRequestUrl(
      issuer,
      clientId,
      pkceCodeChallenge,
      scope,
      redirectUri,
    );

    await expect(result).rejects.toThrow(`No authorization endpoint was found for issuer ${issuer}`);

  });

});

describe('authRequest()', () => {

  it('should perform a fetch request to the desired url', async () => {

    fetchMock.mockResponse('Does not matter');

    await authRequest(issuer, clientId, scope, redirectUri);
    const requestedUrl = fetchMock.mock.calls[0][0];

    expect(requestedUrl).toBeDefined();
    expect(requestedUrl).toContain(`${validSolidOidcObject.authorization_endpoint}?`);
    expect(requestedUrl).toContain(`client_id=${clientId}`);
    expect(requestedUrl).toContain(`code_challenge=`);
    expect(requestedUrl).toContain(`code_challenge_method=S256`);
    expect(requestedUrl).toContain(`response_type=code`);
    expect(requestedUrl).toContain(`scope=${scope}`);
    expect(requestedUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);

  });

  it('should throw when something goes wrong', async () => {

    jest.spyOn(oidcModule, 'constructAuthRequestUrl').mockRejectedValueOnce(undefined);

    await expect(
      async () => await authRequest(issuer, clientId, scope, redirectUri)
    ).rejects.toThrow(`An error occurred while performing an auth request to ${issuer} : `);

  });

  const authRequestParams = { issuer, clientId, scope, redirectUri };

  it.each(Object.keys(authRequestParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...authRequestParams };
    testArgs[keyToBeNull] = undefined;

    const result = authRequest(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.scope,
      testArgs.redirectUri,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('tokenRequest()', () => {

  // populate the store with DPoP keys
  beforeEach(() => generateKeys());
  beforeEach(() => fetchMock.mockResponse(JSON.stringify({ access_token: 'at', id_token: 'it', refresh_token: 'rt' })));

  it('should perform a fetch request to the desired url', async () => {

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri);
    expect(fetchMock.mock.calls[0][0]).toBe(validSolidOidcObject.token_endpoint);

  });

  it('should perform a fetch request with a DPoP header', async () => {

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri);
    expect(fetchMock.mock.calls[0][1]?.headers['DPoP']).toBeDefined();
    expect(fetchMock.mock.calls[0][1]?.headers['DPoP']).toBeTruthy();

  });

  it('should perform a fetch request with the correct body', async () => {

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri);

    const body1 = fetchMock.mock.calls[0][1]?.body;
    expect(body1).toBeDefined();

    const stringBody1 = body1.toString();
    expect(stringBody1).toContain('grant_type=authorization_code');
    expect(stringBody1).toContain(`code=${authorizationCode}`);
    expect(stringBody1).toContain(`client_id=${clientId}`);
    expect(stringBody1).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    // encodeURIComponent() does not encode ~
    const verifier = await store.get('codeVerifier');
    expect(stringBody1).toContain(`code_verifier=${verifier.split('~').join('%7E')}`);
    expect(stringBody1).not.toContain(`client_secret=`);

    //

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri, clientSecret);

    const body2 = fetchMock.mock.calls[1][1]?.body;
    expect(body2).toBeDefined();

    const stringBody2 = body2.toString();
    expect(stringBody2).toContain('grant_type=authorization_code');
    expect(stringBody2).toContain(`code=${authorizationCode}`);
    expect(stringBody2).toContain(`client_id=${clientId}`);
    expect(stringBody2).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    // encodeURIComponent() does not encode ~
    const verifier2 = await store.get('codeVerifier');
    expect(stringBody2).toContain(`code_verifier=${verifier2.split('~').join('%7E')}`);
    expect(stringBody2).toContain(`client_secret=${clientSecret}`);

  });

  it('should save the tokens returned by the server to the store when they are present', async () => {

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

  it('should throw when no token endpoint was found for the given issuer', async () => {

    jest.spyOn(issuerModule, 'getEndpoint').mockResolvedValueOnce(undefined);

    const result = tokenRequest(
      issuer,
      clientId,
      authorizationCode,
      redirectUri,
    );

    await expect(result).rejects.toThrow(`No token endpoint was found for issuer ${issuer}`);

  });

  it('should throw when something goes wrong', async () => {

    fetchMock.mockResponse(undefined);

    const result = tokenRequest(
      issuer,
      clientId,
      authorizationCode,
      redirectUri,
    );

    await expect(result).rejects.toThrow(`An error occurred while requesting tokens for issuer "${issuer}" : `);

  });

  it('should throw when no code verifier was found in the store', async () => {

    const verifier = await store.get('codeVerifier');
    await store.delete('codeVerifier');

    const result = tokenRequest(issuer, clientId, authorizationCode, redirectUri);

    await expect(result).rejects.toThrow(`No code verifier was found in the store`);

    await store.set('codeVerifier', verifier);

  });

  it('should throw when the token request response contains an error field', async () => {

    fetchMock.mockResponse(JSON.stringify({ error: 'abcdefgh' }));

    const result = tokenRequest(issuer, clientId, authorizationCode, redirectUri);
    await expect(result).rejects.toThrow('abcdefgh');

  });

  it('should throw when the response does not contain an access_token and id_token', async () => {

    fetchMock.mockResponse(JSON.stringify({ id_token: 'it' }));

    const result = tokenRequest(issuer, clientId, authorizationCode, redirectUri);
    await expect(result).rejects.toThrow('The tokenRequest response must contain an access_token field, and it did not.');

    fetchMock.mockResponses(JSON.stringify({ access_token: 'at' }));

    const result2 = tokenRequest(issuer, clientId, authorizationCode, redirectUri);
    await expect(result2).rejects.toThrow('The tokenRequest response must contain an id_token field, and it did not.');

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

  // populate the store with DPoP keys
  beforeEach(() => generateKeys());
  beforeEach(() => fetchMock.mockResponse(JSON.stringify({ access_token: 'at', id_token: 'it' })));

  it('should perform a fetch request to the desired url', async () => {

    await refreshTokenRequest(issuer, clientId, refreshToken, scope);
    expect(fetchMock.mock.calls[0][0]).toBe(validSolidOidcObject.token_endpoint);

  });

  it('should perform a fetch request with a DPoP header', async () => {

    await refreshTokenRequest(issuer, clientId, refreshToken, scope);
    expect(fetchMock.mock.calls[0][1]?.headers['DPoP']).toBeDefined();
    expect(fetchMock.mock.calls[0][1]?.headers['DPoP']).toBeTruthy();

  });

  it('should perform a fetch request with the correct body', async () => {

    await refreshTokenRequest(issuer, clientId, refreshToken, scope);

    const body1 = fetchMock.mock.calls[0][1]?.body;
    expect(body1).toBeDefined();

    const stringBody1 = body1.toString();
    expect(stringBody1).toContain('grant_type=refresh_token');
    expect(stringBody1).toContain(`client_id=${clientId}`);
    expect(stringBody1).toContain(`scope=${scope}`);
    expect(stringBody1).not.toContain(`client_secret=`);

    //

    await refreshTokenRequest(issuer, clientId, refreshToken, scope, clientSecret);

    const body2 = fetchMock.mock.calls[1][1]?.body;
    expect(body2).toBeDefined();

    const stringBody2 = body2.toString();
    expect(stringBody2).toContain('grant_type=refresh_token');
    expect(stringBody2).toContain(`client_id=${clientId}`);
    expect(stringBody2).toContain(`scope=${scope}`);
    expect(stringBody2).toContain(`client_secret=`);

  });

  it('should save the tokens returned by the server to the store', async () => {

    await refreshTokenRequest(issuer, clientId, refreshToken, scope);

    await expect(store.has('accessToken')).resolves.toBe(true);
    await expect(store.get('accessToken')).resolves.toBe('at');
    await store.delete('accessToken');
    await expect(store.has('idToken')).resolves.toBe(true);
    await expect(store.get('idToken')).resolves.toBe('it');
    await store.delete('idToken');

  });

  it('should throw when the response does not contain an access_token and id_token', async () => {

    fetchMock.mockResponses(JSON.stringify({ id_token: 'it' }));
    const result = refreshTokenRequest(issuer, clientId, refreshToken, scope);
    await expect(result).rejects.toThrow('The tokenRequest response must contain an access_token field, and it did not.');

    fetchMock.mockResponses(JSON.stringify({ access_token: 'at' }));
    const result2 = refreshTokenRequest(issuer, clientId, refreshToken, scope);
    await expect(result2).rejects.toThrow('The tokenRequest response must contain an id_token field, and it did not.');

  });

  it('should throw when no token endpoint was found for the given issuer', async () => {

    jest.spyOn(issuerModule, 'getEndpoint').mockResolvedValueOnce(undefined);

    const result = refreshTokenRequest(issuer, clientId, refreshToken, scope);
    await expect(result).rejects.toThrow(`No token endpoint was found for issuer ${issuer}`);

  });

  it('should throw when parameter scope does not contain "openid"', async () => {

    const result = refreshTokenRequest(issuer, clientId, refreshToken, 'scope');

    await expect(result).rejects.toThrow(`Parameter "scope" should contain "openid"`);

  });

  it('should throw when something goes wrong', async () => {

    fetchMock.mockRejectedValueOnce(undefined);

    const result = refreshTokenRequest(issuer, clientId, refreshToken, scope);
    await expect(result).rejects.toThrow(`An error occurred while refreshing tokens for issuer "${issuer}" : `);

  });

  it('should throw when the refresh request response contains an error field', async () => {

    fetchMock.mockResponse(JSON.stringify({ error: 'abcdefgh' }));

    const result = refreshTokenRequest(issuer, clientId, refreshToken, scope);
    await expect(result).rejects.toThrow('abcdefgh');

  });

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

  beforeEach(() => generateKeys());
  beforeEach(() => store.set('accessToken', dummyValidAccessToken));
  beforeEach(() => fetchMock.mockResponse(''));

  it('should perform a fetch request to the desired url with the provided method', async () => {

    await accessResource(resource, 'GET');

    expect(fetchMock.mock.calls[0][0]).toBe(resource);
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');

  });

  it('should perform a fetch request with the right headers', async () => {

    await accessResource(resource, 'GET');
    const headers = fetchMock.mock.calls[0][1]?.headers;
    expect(headers).toBeDefined();

    expect(headers['DPoP']).toBeDefined();
    expect(headers['DPoP']).toBeTruthy();
    expect(headers['Authorization']).toBeDefined();
    expect(headers['Authorization']).toBeTruthy();

    //

    fetchMock.mockResponseOnce('');

    await accessResource(resource, 'POST', body, contentType);
    const headers2 = fetchMock.mock.calls[1][1]?.headers;
    expect(headers2).toBeDefined();

    expect(headers2['DPoP']).toBeDefined();
    expect(headers2['DPoP']).toBeTruthy();
    expect(headers2['Authorization']).toBeDefined();
    expect(headers2['Authorization']).toBeTruthy();
    expect(headers2['Content-Type']).toBeDefined();
    expect(headers2['Content-Type']).toBe(contentType);

  });

  it('should perform a fetch request with the correct body', async () => {

    await accessResource(resource, 'GET', undefined, contentType);

    const responseBody = fetchMock.mock.calls[0][1]?.body;
    expect(responseBody).toBeUndefined();

    //

    fetchMock.mockResponseOnce('');

    await accessResource(resource, 'POST', body, contentType);

    const responseBody2 = fetchMock.mock.calls[1][1]?.body;
    expect(responseBody2).toBeDefined();
    expect(responseBody2).toBe(body);

  });

  it('should throw when something goes wrong', async () => {

    fetchMock.mockRejectedValueOnce(undefined);

    await expect(
      async () => await accessResource(resource, 'GET', undefined, contentType)
    ).rejects.toThrow(`An error occurred trying to access resource ${resource} : `);

  });

  it('should throw when no access token was found in the store', async () => {

    await store.delete('accessToken');

    await expect(
      async () => await accessResource(resource, 'GET', undefined, contentType)
    ).rejects.toThrow('No access token was found in the store');

  });

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

