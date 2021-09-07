// Fix to be able to run tests in jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { issuer, clientId, scope, responseType, webId, redirectUri, profileWithIssuers, mockedResponseValidSolidOidc, mockedResponseInvalidSolidOidc, issuer1, clientSecret, authorizationCode, codeVerifier, handleAuthRequestUrl, getAuthorizationCode } from '../../test/test-data';
import { handleIncomingRedirect, loginWithIssuer, loginWithWebId } from './client';
import * as clientModule from './client';
import * as oidcModule from './oidc';

enableFetchMocks();

beforeEach(() => {

  fetchMock.resetMocks();
  jest.clearAllMocks();

});

describe('loginWithIssuer()', () => {

  it('should call authRequest from the oidc module', async () => {

    const spy = jest.spyOn(oidcModule, 'authRequest').mockResolvedValueOnce();

    await loginWithIssuer(issuer, clientId, scope, redirectUri, handleAuthRequestUrl);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(issuer, clientId, scope, redirectUri, handleAuthRequestUrl);

  });

  const loginWithIssuerParams = { issuer, clientId, scope, redirectUri };

  it.each(Object.keys(loginWithIssuerParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...loginWithIssuerParams };
    testArgs[keyToBeNull] = undefined;

    const result = loginWithIssuer(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.scope,
      testArgs.redirectUri,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('loginWithWebId()', () => {

  it('should throw when no valid issuer was found on the profile of the webId', async () => {

    fetchMock.mockResponses(
      [ profileWithIssuers, { status: 200 } ],
      [ mockedResponseInvalidSolidOidc, { status: 200 } ],
      [ mockedResponseInvalidSolidOidc, { status: 200 } ]
    );

    const result = loginWithWebId(webId, clientId, scope, redirectUri, handleAuthRequestUrl);
    await expect(result).rejects.toThrow(`No issuer was found on the profile of ${webId}`);

  });

  it('should call loginWithIssuer', async () => {

    fetchMock.mockResponses(
      [ profileWithIssuers, { status: 200 } ],
      [ mockedResponseValidSolidOidc, { status: 200 } ],
      [ mockedResponseValidSolidOidc, { status: 200 } ]
    );

    const spy = jest.spyOn(clientModule, 'loginWithIssuer').mockResolvedValueOnce();

    await loginWithWebId(webId, clientId, scope, redirectUri, handleAuthRequestUrl);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(issuer1.url.toString(), clientId, scope, redirectUri, handleAuthRequestUrl);

  });

  const loginWithWebIdParams = { webId, clientId, scope, redirectUri };

  it.each(Object.keys(loginWithWebIdParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...loginWithWebIdParams };
    testArgs[keyToBeNull] = undefined;

    const result = loginWithWebId(
      testArgs.webId,
      testArgs.clientId,
      testArgs.scope,
      testArgs.redirectUri,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('handleIncomingRedirect()', () => {

  let spy;

  beforeEach(() => {

    spy = jest.spyOn(oidcModule, 'tokenRequest').mockResolvedValue({
      accessToken: 'at', idToken: 'it',
    });

  });

  it('should call tokenEndpoint() with the right parameters', async () => {

    await handleIncomingRedirect(
      issuer, clientId, redirectUri, codeVerifier, {}, {}, getAuthorizationCode, clientSecret
    );

    expect(spy).toHaveBeenCalledTimes(1);

    expect(spy).toHaveBeenCalledWith(
      issuer, clientId, authorizationCode, redirectUri, codeVerifier, {}, {}, clientSecret
    );

  });

  it('should throw when no authorization code was found in the page\'s url', async () => {

    const result = handleIncomingRedirect(
      issuer, clientId, redirectUri, codeVerifier, {}, {}, () => undefined, clientSecret,
    );

    await expect(result).rejects.toThrow('No authorization code was found, make sure you provide the correct function!');

  });

  it('should throw when anything goes wrong', async () => {

    jest.spyOn(oidcModule, 'tokenRequest').mockRejectedValueOnce(new Error('test error'));

    const result = handleIncomingRedirect(
      issuer, clientId, redirectUri, codeVerifier, {}, {}, getAuthorizationCode, clientSecret,
    );

    await expect(result).rejects.toThrow('An error occurred handling the incoming redirect : Error: test error');

  });

  const handleIncomingRedirectParams = { issuer, clientId, redirectUri, codeVerifier, publicKey: {}, privateKey: {} };

  it.each(Object.keys(handleIncomingRedirectParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...handleIncomingRedirectParams };
    testArgs[keyToBeNull] = undefined;

    const result = handleIncomingRedirect(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.redirectUri,
      testArgs.codeVerifier,
      testArgs.publicKey,
      testArgs.privateKey,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});
