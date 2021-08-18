import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { handleIncommingRedirect, loginWithIssuer, loginWithWebId } from './client';

enableFetchMocks();

beforeEach(() => {

  fetchMock.resetMocks();

});

const issuer = 'https://issuer.com';
const webId = 'https://web.id';
const redirectUri = 'https://redirect.uri';
const clientId = 'clientId';
const scope = 'scope';
const responseType = 'responseType';

describe('loginWithIssuer()', () => {

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

});

describe('handleIncommingRedirect()', () => {

  const handleIncommingRedirectParams = { issuer, clientId, redirectUri };

  it.each(Object.keys(handleIncommingRedirectParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...handleIncommingRedirectParams };
    testArgs[keyToBeNull] = undefined;

    const result = handleIncommingRedirect(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.redirectUri,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});
