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
const offline_access = false;
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

  it('should throw when parameter issuer is undefined', async () => {

    const result = constructAuthRequestUrl(
      undefined,
      clientId,
      pkceCodeChallenge,
      responseType,
      scope,
      redirectUri,
    );

    await expect(result).rejects.toThrow('Parameter "issuer" should be set');

  });

  it('should throw when parameter clientId is undefined', async () => {

    const result = constructAuthRequestUrl(
      issuer,
      undefined,
      pkceCodeChallenge,
      responseType,
      scope,
      redirectUri,
    );

    await expect(result).rejects.toThrow('Parameter "clientId" should be set');

  });

  it('should throw when parameter pkceCodeChallenge is undefined', async () => {

    const result = constructAuthRequestUrl(
      issuer,
      clientId,
      undefined,
      responseType,
      scope,
      redirectUri,
    );

    await expect(result).rejects.toThrow('Parameter "pkceCodeChallenge" should be set');

  });

  it('should throw when parameter responseType is undefined', async () => {

    const result = constructAuthRequestUrl(
      issuer,
      clientId,
      pkceCodeChallenge,
      undefined,
      scope,
      redirectUri,
    );

    await expect(result).rejects.toThrow('Parameter "responseType" should be set');

  });

  it('should throw when parameter scope is undefined', async () => {

    const result = constructAuthRequestUrl(
      issuer,
      clientId,
      pkceCodeChallenge,
      responseType,
      undefined,
      redirectUri,
    );

    await expect(result).rejects.toThrow('Parameter "scope" should be set');

  });

  it('should throw when parameter redirectUri is undefined', async () => {

    const result = constructAuthRequestUrl(
      issuer,
      clientId,
      pkceCodeChallenge,
      responseType,
      scope,
      undefined,
    );

    await expect(result).rejects.toThrow('Parameter "redirectUri" should be set');

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

  it('should throw when parameter issuer is undefined', async () => {

    const result = authRequest(
      undefined,
      clientId,
      scope,
      responseType,
      offline_access,
    );

    await expect(result).rejects.toThrow('Parameter "issuer" should be set');

  });

  it('should throw when parameter clientId is undefined', async () => {

    const result = authRequest(
      issuer,
      undefined,
      scope,
      responseType,
      offline_access,
    );

    await expect(result).rejects.toThrow('Parameter "clientId" should be set');

  });

  it('should throw when parameter scope is undefined', async () => {

    const result = authRequest(
      issuer,
      clientId,
      undefined,
      responseType,
      offline_access,
    );

    await expect(result).rejects.toThrow('Parameter "scope" should be set');

  });

  it('should throw when parameter responseType is undefined', async () => {

    const result = authRequest(
      issuer,
      clientId,
      scope,
      undefined,
      offline_access,
    );

    await expect(result).rejects.toThrow('Parameter "responseType" should be set');

  });

  it('should throw when parameter offlineAccess is undefined', async () => {

    const result = authRequest(
      issuer,
      clientId,
      scope,
      responseType,
      undefined,
    );

    await expect(result).rejects.toThrow('Parameter "offlineAccess" should be set');

  });

});

describe('tokenRequest()', () => {

  it('should throw when parameter issuer is undefined', async () => {

    const result = tokenRequest(
      undefined,
      clientId,
      authorizationCode,
      redirectUri,
    );

    await expect(result).rejects.toThrow('Parameter "issuer" should be set');

  });

  it('should throw when parameter clientId is undefined', async () => {

    const result = tokenRequest(
      issuer,
      undefined,
      authorizationCode,
      redirectUri,
    );

    await expect(result).rejects.toThrow('Parameter "clientId" should be set');

  });

  it('should throw when parameter authorizationCode is undefined', async () => {

    const result = tokenRequest(
      issuer,
      clientId,
      undefined,
      redirectUri,
    );

    await expect(result).rejects.toThrow('Parameter "authorizationCode" should be set');

  });

  it('should throw when parameter redirectUri is undefined', async () => {

    const result = tokenRequest(
      issuer,
      clientId,
      authorizationCode,
      undefined,
    );

    await expect(result).rejects.toThrow('Parameter "redirectUri" should be set');

  });

});

describe('refreshTokenRequest()', () => {

  it('should throw when parameter issuer is undefined', async () => {

    const result = refreshTokenRequest(
      undefined,
      clientId,
      refreshToken,
      scope,
    );

    await expect(result).rejects.toThrow('Parameter "issuer" should be set');

  });

  it('should throw when parameter clientId is undefined', async () => {

    const result = refreshTokenRequest(
      issuer,
      undefined,
      refreshToken,
      scope,
    );

    await expect(result).rejects.toThrow('Parameter "clientId" should be set');

  });

  it('should throw when parameter refreshToken is undefined', async () => {

    const result = refreshTokenRequest(
      issuer,
      clientId,
      undefined,
      scope,
    );

    await expect(result).rejects.toThrow('Parameter "refreshToken" should be set');

  });

  it('should throw when parameter scope is undefined', async () => {

    const result = refreshTokenRequest(
      issuer,
      clientId,
      refreshToken,
      undefined,
    );

    await expect(result).rejects.toThrow('Parameter "scope" should be set');

  });

});

describe('accessResource()', () => {

  it('should throw when parameter resource is undefined', async () => {

    const result = accessResource(undefined, method);

    await expect(result).rejects.toThrow('Parameter "resource" should be set');

  });

  it('should throw when parameter method is undefined', async () => {

    const result = accessResource(resource, undefined);

    await expect(result).rejects.toThrow('Parameter "method" should be set');

  });

});

