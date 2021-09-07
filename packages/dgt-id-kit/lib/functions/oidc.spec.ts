/* eslint-disable no-console */
// Fix to be able to run tests in jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { dummyValidAccessToken, validSolidOidcObject, issuer, clientId, scope, pkceCodeChallenge, redirectUri, resource, method, contentType, refreshToken, body, clientSecret, authorizationCode, codeVerifier } from '../../test/test-data';
import { HttpMethod } from '../models/http-method.model';
import { constructAuthRequestUrl, authRequest, tokenRequest, refreshTokenRequest, accessResource } from './oidc';
import * as issuerModule from './issuer';
import * as oidcModule from './oidc';
import * as dpopModule from './dpop';

enableFetchMocks();

afterAll(() => {

  jest.clearAllMocks();

});

beforeEach(() => {

  jest.spyOn(issuerModule, 'getEndpoint').mockImplementation(async (_issuer: string, endpoint: string): Promise<string> => {

    switch (endpoint) {

      case 'token_endpoint': return validSolidOidcObject.token_endpoint;
      case 'authorization_endpoint': return validSolidOidcObject.authorization_endpoint;
      default: return validSolidOidcObject.token_endpoint;

    }

  });

  jest.spyOn(dpopModule, 'createDpopProof').mockImplementation(
    async (): Promise<string> => 'dpopProof'
  );

});

beforeEach(() => fetchMock.mockClear());

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
    await expect(result).resolves.toContain(`client_id=${encodeURIComponent(clientId)}`);
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

    const spy = jest.spyOn(global.console, 'log');

    const result = authRequest(issuer, clientId, scope, redirectUri, async () => { console.log('log something'); });

    await expect(result).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('log something');

  });

  it('should throw when something goes wrong', async () => {

    jest.spyOn(oidcModule, 'constructAuthRequestUrl').mockRejectedValueOnce(undefined);

    await expect(
      async () => await authRequest(issuer, clientId, scope, redirectUri, async () => { console.log('log something'); })
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
      testArgs.redirectUri
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('tokenRequest()', () => {

  beforeEach(() => fetchMock.mockResponse(JSON.stringify({ access_token: 'at', id_token: 'it' })));

  it('should perform a fetch request to the desired url', async () => {

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri, codeVerifier, {}, {});
    expect(fetchMock.mock.calls[0][0]).toBe(validSolidOidcObject.token_endpoint);

  });

  it('should perform a fetch request with a DPoP header', async () => {

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri, codeVerifier, {}, {});
    expect(fetchMock.mock.calls[0][1]?.headers['DPoP']).toBeDefined();
    expect(fetchMock.mock.calls[0][1]?.headers['DPoP']).toBeTruthy();

  });

  it('should perform a fetch request with the correct body', async () => {

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri, codeVerifier, {}, {});

    const body1 = fetchMock.mock.calls[0][1]?.body;
    expect(body1).toBeDefined();

    const stringBody1 = body1.toString();
    expect(stringBody1).toContain('grant_type=authorization_code');
    expect(stringBody1).toContain(`code=${authorizationCode}`);
    expect(stringBody1).toContain(`client_id=${clientId}`);
    expect(stringBody1).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    expect(stringBody1).toContain(`code_verifier=${codeVerifier}`);
    expect(stringBody1).not.toContain(`client_secret=`);

    //

    await tokenRequest(issuer, clientId, authorizationCode, redirectUri, codeVerifier, {}, {}, clientSecret);

    const body2 = fetchMock.mock.calls[1][1]?.body;
    expect(body2).toBeDefined();

    const stringBody2 = body2.toString();
    expect(stringBody2).toContain('grant_type=authorization_code');
    expect(stringBody2).toContain(`code=${authorizationCode}`);
    expect(stringBody2).toContain(`client_id=${clientId}`);
    expect(stringBody2).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    expect(stringBody2).toContain(`code_verifier=${codeVerifier}`);
    expect(stringBody2).toContain(`client_secret=${clientSecret}`);

  });

  it('should return an object containing the tokens returned by the server', async () => {

    const result = tokenRequest(issuer, clientId, authorizationCode, redirectUri, codeVerifier, {}, {});
    await expect(result).resolves.toBeDefined();
    const awaitedResult = await result;
    expect(awaitedResult.accessToken).toBe('at');
    expect(awaitedResult.idToken).toBe('it');
    expect(awaitedResult.refreshToken).toBeUndefined();

    fetchMock.mockResponseOnce(JSON.stringify({ access_token: 'at', id_token: 'it', refresh_token: 'rt' }));

    const result2 = tokenRequest(issuer, clientId, authorizationCode, redirectUri, codeVerifier, {}, {});
    await expect(result2).resolves.toBeDefined();
    const awaitedResult2 = await result2;
    expect(awaitedResult2.accessToken).toBe('at');
    expect(awaitedResult2.idToken).toBe('it');
    expect(awaitedResult2.refreshToken).toBe('rt');

  });

  it('should throw when no token endpoint was found for the given issuer', async () => {

    jest.spyOn(issuerModule, 'getEndpoint').mockResolvedValueOnce(undefined);

    const result = tokenRequest(
      issuer,
      clientId,
      authorizationCode,
      redirectUri,
      codeVerifier,
      {},
      {},
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
      codeVerifier,
      {},
      {}
    );

    await expect(result).rejects.toThrow(`An error occurred while requesting tokens for issuer "${issuer}" : `);

  });

  it('should throw when the token request response contains an error field', async () => {

    fetchMock.mockResponse(JSON.stringify({ error: 'abcdefgh' }));

    const result = tokenRequest(issuer, clientId, authorizationCode, redirectUri, codeVerifier, {}, {});
    await expect(result).rejects.toThrow('abcdefgh');

  });

  it('should throw when the response does not contain an access_token and id_token', async () => {

    fetchMock.mockResponse(JSON.stringify({ id_token: 'it' }));

    const result = tokenRequest(issuer, clientId, authorizationCode, redirectUri, codeVerifier, {}, {});
    await expect(result).rejects.toThrow('The tokenRequest response must contain an access_token field, and it did not.');

    fetchMock.mockResponses(JSON.stringify({ access_token: 'at' }));

    const result2 = tokenRequest(issuer, clientId, authorizationCode, redirectUri, codeVerifier, {}, {});
    await expect(result2).rejects.toThrow('The tokenRequest response must contain an id_token field, and it did not.');

  });

  const tokenRequestParams = { issuer, clientId, authorizationCode, redirectUri,
    codeVerifier, publicKey: {}, privateKey: {} };

  it.each(Object.keys(tokenRequestParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...tokenRequestParams };
    testArgs[keyToBeNull] = undefined;

    const result = tokenRequest(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.authorizationCode,
      testArgs.redirectUri,
      testArgs.codeVerifier,
      testArgs.publicKey,
      testArgs.privateKey,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('refreshTokenRequest()', () => {

  beforeEach(() => fetchMock.mockResponse(JSON.stringify({ access_token: 'at', refresh_token: 'rt', id_token: 'it' })));

  it('should perform a fetch request to the desired url', async () => {

    await refreshTokenRequest(issuer, clientId, refreshToken, {}, {});
    expect(fetchMock.mock.calls[0][0]).toBe(validSolidOidcObject.token_endpoint);

  });

  it('should perform a fetch request with a DPoP header', async () => {

    await refreshTokenRequest(issuer, clientId, refreshToken, {}, {});
    expect(fetchMock.mock.calls[0][1]?.headers['DPoP']).toBeDefined();
    expect(fetchMock.mock.calls[0][1]?.headers['DPoP']).toBeTruthy();

  });

  it('should perform a fetch request with the correct body', async () => {

    await refreshTokenRequest(issuer, clientId, refreshToken, {}, {});

    const body1 = fetchMock.mock.calls[0][1]?.body;
    expect(body1).toBeDefined();

    const stringBody1 = body1.toString();
    expect(stringBody1).toContain('grant_type=refresh_token');
    expect(stringBody1).toContain(`client_id=${clientId}`);
    expect(stringBody1).not.toContain(`client_secret=`);
    expect(stringBody1).toContain(`refresh_token=${refreshToken}`);

    //

    await refreshTokenRequest(issuer, clientId, refreshToken, {}, {}, clientSecret);

    const body2 = fetchMock.mock.calls[1][1]?.body;
    expect(body2).toBeDefined();

    const stringBody2 = body2.toString();
    expect(stringBody2).toContain('grant_type=refresh_token');
    expect(stringBody2).toContain(`client_id=${clientId}`);
    expect(stringBody2).toContain(`client_secret=`);
    expect(stringBody2).toContain(`refresh_token=${refreshToken}`);

  });

  it('should return all tokens returned by the server', async () => {

    const result = refreshTokenRequest(issuer, clientId, refreshToken, {}, {});
    await expect(result).resolves.toBeDefined();
    const awaitedResult = await result;
    expect(awaitedResult.accessToken).toBe('at');
    expect(awaitedResult.refreshToken).toBe('rt');
    expect(awaitedResult.idToken).toBe('it');

  });

  it('should throw when the response does not contain an access_token, id_token and refresh_token', async () => {

    fetchMock.mockResponses(JSON.stringify({ refresh_token: 'rt', id_token: 'it' }));
    const result = refreshTokenRequest(issuer, clientId, refreshToken, {}, {});
    await expect(result).rejects.toThrow('The tokenRequest response must contain an access_token field, and it did not.');

    fetchMock.mockResponses(JSON.stringify({ access_token: 'at', id_token: 'it' }));
    const result2 = refreshTokenRequest(issuer, clientId, refreshToken, {}, {});
    await expect(result2).rejects.toThrow('The tokenRequest response must contain an refresh_token field, and it did not.');

    fetchMock.mockResponses(JSON.stringify({ access_token: 'at', refresh_token: 'rt' }));
    const result3 = refreshTokenRequest(issuer, clientId, refreshToken, {}, {});
    await expect(result3).rejects.toThrow('The tokenRequest response must contain an id_token field, and it did not.');

  });

  it('should throw when no token endpoint was found for the given issuer', async () => {

    jest.spyOn(issuerModule, 'getEndpoint').mockResolvedValueOnce(undefined);

    const result = refreshTokenRequest(issuer, clientId, refreshToken, {}, {});
    await expect(result).rejects.toThrow(`No token endpoint was found for issuer ${issuer}`);

  });

  it('should throw when something goes wrong', async () => {

    fetchMock.mockRejectedValueOnce(undefined);

    const result = refreshTokenRequest(issuer, clientId, refreshToken, {}, {});
    await expect(result).rejects.toThrow(`An error occurred while refreshing tokens for issuer "${issuer}" : `);

  });

  it('should throw when the refresh request response contains an error field', async () => {

    fetchMock.mockResponse(JSON.stringify({ error: 'abcdefgh' }));

    const result = refreshTokenRequest(issuer, clientId, refreshToken, {}, {});
    await expect(result).rejects.toThrow('abcdefgh');

  });

  const refreshTokenRequestParams = { issuer, clientId, refreshToken, publicKey: {}, privateKey: {} };

  it.each(Object.keys(refreshTokenRequestParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...refreshTokenRequestParams };
    testArgs[keyToBeNull] = undefined;

    const result = refreshTokenRequest(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.refreshToken,
      testArgs.publicKey,
      testArgs.privateKey,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('accessResource()', () => {

  beforeEach(() => fetchMock.mockResponse(''));

  it('should perform a fetch request to the desired url with the provided method', async () => {

    await accessResource(resource, 'GET', dummyValidAccessToken, {}, {});

    expect(fetchMock.mock.calls[0][0]).toBe(resource);
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');

  });

  it('should perform a fetch request with the right headers', async () => {

    await accessResource(resource, 'GET', dummyValidAccessToken, {}, {});
    const headers = fetchMock.mock.calls[0][1]?.headers;
    expect(headers).toBeDefined();

    expect(headers['DPoP']).toBeDefined();
    expect(headers['DPoP']).toBeTruthy();
    expect(headers['Authorization']).toBeDefined();
    expect(headers['Authorization']).toBeTruthy();

    //

    await accessResource(resource, 'POST', dummyValidAccessToken, {}, {}, body, contentType);
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

    await accessResource(resource, 'GET', dummyValidAccessToken, {}, {}, undefined, contentType);

    const responseBody = fetchMock.mock.calls[0][1]?.body;
    expect(responseBody).toBeUndefined();

    //

    await accessResource(resource, 'POST', dummyValidAccessToken, {}, {}, body, contentType);

    const responseBody2 = fetchMock.mock.calls[1][1]?.body;
    expect(responseBody2).toBeDefined();
    expect(responseBody2).toBe(body);

  });

  it('should throw when something goes wrong', async () => {

    fetchMock.mockRejectedValueOnce(undefined);

    await expect(
      async () => await accessResource(resource, 'GET', dummyValidAccessToken, {}, {}, undefined, contentType)
    ).rejects.toThrow(`An error occurred trying to access resource ${resource} : `);

  });

  const accessResourceParams = { resource, method, accessToken: dummyValidAccessToken, publicKey: {}, privateKey: {} };

  it.each(Object.keys(accessResourceParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...accessResourceParams };
    testArgs[keyToBeNull] = undefined;

    const result = accessResource(
      testArgs.resource,
      testArgs.method as HttpMethod,
      testArgs.accessToken,
      testArgs.publicKey,
      testArgs.privateKey,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

