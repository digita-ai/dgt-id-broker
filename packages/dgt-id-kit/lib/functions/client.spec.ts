import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { handleIncomingRedirect, loginWithIssuer, loginWithWebId } from './client';

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

  });

});

describe('handleIncomingRedirect()', () => {

  const handleIncomingRedirectParams = { issuer, clientId, redirectUri };

  it.each(Object.keys(handleIncomingRedirectParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...handleIncommingRedirectParams };
    testArgs[keyToBeNull] = undefined;

    const result = handleIncomingRedirect(
      testArgs.issuer,
      testArgs.clientId,
      testArgs.redirectUri,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

});
