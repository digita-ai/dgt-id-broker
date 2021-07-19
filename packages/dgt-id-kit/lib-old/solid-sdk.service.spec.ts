import * as client from '@digita-ai/inrupt-solid-client';
import fetchMock, { MockResponseInitFunction, enableFetchMocks } from 'jest-fetch-mock';
import { SolidSDKService } from './solid-sdk.service';

describe('SolidService', () => {

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require('crypto');

  const exampleWebId = 'https://example.com/webid';
  const exampleIssuerUrl = 'https://example.com/issuer';

  const exampleIssuer = {
    'description': 'Example',
    'icon': 'https://example.com/issuer/favicon.ico',
    'uri': exampleIssuerUrl,
  };

  let service: SolidSDKService;

  beforeAll(async () => {

    enableFetchMocks();

    Object.defineProperty(window, 'crypto', {
      value: {
        getRandomValues: (buffer) => nodeCrypto.randomFillSync(buffer),
      },
    });

  });

  beforeEach(async () => {

    service = new SolidSDKService('Testservice');

    fetchMock.resetMocks();

  });

  afterEach(() => {

    jest.clearAllMocks();

  });

  it('should be correctly instantiated', () => {

    expect(service).toBeTruthy();

  });

  describe('getSession()', () => {

    it('should call handleIncomingRedirect', async () => {

      Object.defineProperty(client, 'handleIncomingRedirect', { value: jest.fn(async () => ({ webId: exampleWebId, isLoggedIn: true })) });

      await service.getSession();

      expect(client.handleIncomingRedirect).toBeCalledTimes(1);

    });

    it('should return the session when logged in with a webid', async () => {

      Object.defineProperty(client, 'handleIncomingRedirect', { value: jest.fn(async () => ({ webId: exampleWebId, isLoggedIn: true })) });

      await expect(service.getSession()).resolves.toEqual({ webId: exampleWebId });

    });

    it.each([
      { webId: exampleWebId, isLoggedIn: false },
      { isLoggedIn: false },
      { isLoggedIn: true },
      undefined,
      null,
    ])('should error when no session or webid exists, or the webid is not logged in', async (handledRedirect) => {

      Object.defineProperty(client, 'handleIncomingRedirect', { value: jest.fn(async () => handledRedirect) });

      await expect(service.getSession()).rejects.toEqual('No session with logged in webid found.');

    });

  });

  describe('login()', () => {

    it.each([ null, undefined ])('should error when WebID is %s', async (value) => {

      await expect(service.login(value)).rejects.toThrow('WebId should be set.');

    });

    it('should throw when retrieved issuer is falsy', async () => {

      service.getIssuer = jest.fn(() => undefined);

      await expect(service.login('test')).rejects.toThrow('Issuer should be set.');

    });

    it('should call login when issuer was set', async () => {

      Object.defineProperty(client, 'login', { value: jest.fn(() => 'success') });
      Object.defineProperty(service, 'getIssuer', { value: jest.fn(async () => 'http://google.com/') });

      await service.login('test');

      expect(client.login).toHaveBeenCalled();

    });

  });

  describe('logout()', () => {

    it.each([ null, undefined ])('should error when WebID is %s', async (value) => {

      Object.defineProperty(client, 'logout', { value: jest.fn().mockResolvedValue(null) });

      await expect(service.logout()).resolves.not.toThrow();

    });

  });

  describe('getIssuer', () => {

    beforeEach(() => {

      Object.defineProperty(client, 'getSolidDataset', { value: jest.fn(async () => ({})) });
      Object.defineProperty(client, 'getThing', { value: jest.fn(async () => ({})) });
      Object.defineProperty(client, 'getUrlAll', { value: jest.fn(() => [ exampleIssuerUrl ]) });

    });

    it.each([ null, undefined ])('should error when webid is %s', async (webId) => {

      Object.defineProperty(client, 'getSolidDataset', { value: jest.fn(async () => ({})) });

      fetchMock.mockResponses('');

      await expect(service.getIssuer(webId)).rejects.toThrowError(`WebId must be set.`);

    });

    it('should error when webId is invalid', async () => {

      Object.defineProperty(client, 'getSolidDataset', { value: jest.fn(async () => ({})) });

      fetchMock.mockResponses('');

      const invalidWebId = 'invalid-url';

      await expect(service.getIssuer(invalidWebId)).rejects.toThrowError(`Invalid WebId: ${invalidWebId}`);

    });

    it.each([ null, undefined ])('should error when profile is %s', async (dataset) => {

      Object.defineProperty(client, 'getSolidDataset', { value: jest.fn(async () => dataset) });

      fetchMock.mockResponses('');

      await expect(service.getIssuer(exampleWebId)).rejects.toThrowError(`Could not read profile for WebId: ${exampleWebId}`);

    });

    it('should error when unable to get dataset', async () => {

      Object.defineProperty(client, 'getSolidDataset', { value: jest.fn(async () => { throw Error(); }) });

      await expect(service.getIssuer(exampleWebId)).rejects.toThrow();

    });

    it('should error when profile is null', async () => {

      Object.defineProperty(client, 'getThing', { value: jest.fn().mockReturnValueOnce(null) });

      await expect(service.getIssuer(exampleWebId)).rejects.toThrow();

    });

    it('should error when issuer is null', async () => {

      Object.defineProperty(client, 'getUrlAll', { value: jest.fn().mockReturnValueOnce(null) });

      await expect(service.getIssuer(exampleWebId)).rejects.toThrow();

    });

    it('should error when oidcIssuer openid config is invalid', async () => {

      fetchMock.mockRejectOnce();

      await expect(service.getIssuer(exampleWebId)).rejects.toThrowError(`No valid OIDC issuers for WebID: ${exampleWebId}`);

    });

    it('should error when oidcIssuer response does not contain "X-Powered-By: solid" header', async () => {

      fetchMock.mockResponseOnce('{}', { status: 200, headers: { 'X-Powered-By': '' } });

      await expect(service.getIssuer(exampleWebId)).rejects.toThrowError(`No valid OIDC issuers for WebID: ${exampleWebId}`);

    });

    it('should return issuer when openid response contains "X-Powered-By: solid" header', async () => {

      fetchMock.mockResponse('{}', { status: 200, headers: { 'X-Powered-By': 'solid-server/5.6.6' } });

      await expect(service.getIssuer(exampleWebId)).resolves.toEqual(exampleIssuer);

    });

  });

  describe('getProfile', () => {

    it('should error when WebID is null', async () => {

      await expect(service.getProfile(null)).rejects.toThrow();

    });

    it('should error when WebID is not a valid url', async () => {

      await expect(service.getProfile('noURL')).rejects.toThrow();

    });

    it('should error when unable to set dataset', async () => {

      Object.defineProperty(client, 'getSolidDataset', { value: jest.fn(async () => { throw Error(); }) });

      await expect(service.getProfile(exampleWebId)).rejects.toThrow();

    });

    it('should error when no dataset is found', async () => {

      Object.defineProperty(client, 'getSolidDataset', { value: jest.fn(async () =>  null) });

      await expect(service.getProfile(exampleWebId)).rejects.toThrow();

    });

    it('should error when no profile is found', async () => {

      Object.defineProperty(client, 'getSolidDataset', { value: jest.fn(async () => ({})) });
      Object.defineProperty(client, 'getThing', { value: jest.fn(() => null) });

      await expect(service.getProfile(exampleWebId)).rejects.toThrow();

    });

    it('should return valid profile when found', async () => {

      const validName = 'mockString';

      Object.defineProperty(client, 'getSolidDataset', { value: jest.fn(async () => ({})) });
      Object.defineProperty(client, 'getThing', { value: jest.fn(() => ({})) });
      Object.defineProperty(client, 'getStringNoLocale', { value: jest.fn(() => validName) });

      const profile = await service.getProfile(exampleWebId);

      expect(profile).toEqual(expect.objectContaining({ name: validName }));

    });

  });

});
