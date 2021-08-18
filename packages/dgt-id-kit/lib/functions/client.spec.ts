import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { dummyValidAccessToken, issuer, clientId, scope, responseType, idToken, webId, refreshToken, redirectUri } from '../../test/test-data';
import { handleIncomingRedirect, loginWithIssuer, loginWithWebId, logout } from './client';
import { store } from './storage';

enableFetchMocks();

beforeEach(() => {

  fetchMock.resetMocks();

});

describe('loginWithIssuer()', () => {

  it('should call authRequest from the oidc module', async () => {

  });

  const loginWithIssuerParams = { issuer, clientId, scope, responseType };

  it.each(Object.keys(loginWithIssuerParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...loginWithIssuerParams };
    testArgs[keyToBeNull] = undefined;

    const result = loginWithIssuer(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.scope,
      testArgs.responseType,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('loginWithWebId()', () => {

  it('should throw when no valid issuer was found on the profile of the webid', async () => {

  });

  it('should call loginWithIssuer', async () => {

  });

  const loginWithWebIdParams = { webId, clientId, scope, responseType };

  it.each(Object.keys(loginWithWebIdParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...loginWithWebIdParams };
    testArgs[keyToBeNull] = undefined;

    const result = loginWithWebId(
      testArgs.webId,
      testArgs.clientId,
      testArgs.scope,
      testArgs.responseType,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});

describe('logout()', () => {

  it('should delete access token, id token and refresh token from the store', async () => {

    await store.set('accessToken', dummyValidAccessToken);
    await store.set('idToken', idToken);
    await store.set('refreshToken', refreshToken);

    await expect(store.has('accessToken')).resolves.toBe(true);
    await expect(store.has('idToken')).resolves.toBe(true);
    await expect(store.has('refreshToken')).resolves.toBe(true);

    await logout();

    await expect(store.has('accessToken')).resolves.toBe(false);
    await expect(store.has('idToken')).resolves.toBe(false);
    await expect(store.has('refreshToken')).resolves.toBe(false);

  });

});

describe('handleIncomingRedirect()', () => {

  const handleIncomingRedirectParams = { issuer, clientId, redirectUri };

  it.each(Object.keys(handleIncomingRedirectParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...handleIncomingRedirectParams };
    testArgs[keyToBeNull] = undefined;

    const result = handleIncomingRedirect(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.redirectUri,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});
