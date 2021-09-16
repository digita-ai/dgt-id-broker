// Fix to be able to run tests in jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { JWK } from 'jose/webcrypto/types';
import { HttpMethod } from '../models/http-method.model';
import { TypedKeyValueStore } from '../models/typed-key-value-store.model';
import { clientId, handleAuthRequestUrl, redirectUri, resource, method, issuer, scope, state, webId, dummyValidAccessToken, refreshToken, idToken, clientSecret, dummyExpiredAccessToken, getAuthorizationCode } from '../../test/test-data';
import * as oidcModule from '../functions/oidc';
import * as clientModule from '../functions/client';
import { SolidOidcClient, storeInterface } from './solid-oidc-client';

beforeEach(() => {

  jest.clearAllMocks();

});

class testStore implements TypedKeyValueStore<storeInterface> {

  data = new Map();

  async get(key) { return this.data.get(key); }
  async has(key) { return this.data.has(key); }
  async delete(key) {

    this.data.delete(key);

    return true;

  }
  async set(key, value) {

    this.data.set(key, value);

    return this;

  }
  async* entries(): AsyncIterableIterator<[keyof storeInterface, string | JWK]> {

    for (const [ key, value ] of this.data.entries()) {

      yield [ key, value ];

    }

  }

}

describe('SolidOidcClient', () => {

  let store: TypedKeyValueStore<storeInterface>;
  let instance: SolidOidcClient;

  beforeEach(() => {

    store = new testStore();
    instance = new SolidOidcClient(store, false, clientId);

  });

  describe('constructor()', () => {

    it('should set the given store to this.store and client id', async () => {

      expect((instance as any).store).toEqual(store);
      expect((instance as any).initialized).toEqual(false);
      expect((instance as any).clientId).toEqual(clientId);

    });

    it('should throw when initialized is false and no client id was given', async () => {

      expect(
        () => new SolidOidcClient(store, false, undefined)
      ).toThrow('Parameter initialized can not be false when no clientId was provided');

    });

  });

  describe('initialize()', () => {

    it('should create a public key, private key and a codeVerifier and set it to the store', async () => {

      await (instance as any).initialize();
      await expect(store.get('publicKey')).resolves.toBeDefined();
      await expect(store.get('privateKey')).resolves.toBeDefined();
      await expect(store.get('codeVerifier')).resolves.toBeDefined();
      await expect(store.get('clientId')).resolves.toBeDefined();

    });

    it('should not set the clientId to the store', async () => {

      (instance as any).clientId = undefined;
      await (instance as any).initialize();
      await expect(store.get('clientId')).resolves.toBeUndefined();

    });

    it('should set field initialized to true', async () => {

      expect((instance as any).initialized).toBe(false);
      await (instance as any).initialize();
      expect((instance as any).initialized).toBe(true);

    });

  });

  describe('loginWithIssuer()', () => {

    it('should call authRequest() with the right parameters', async () => {

      const spy = jest.spyOn(clientModule, 'loginWithIssuer').mockResolvedValueOnce(undefined);

      const result = await instance.loginWithIssuer(issuer, scope, redirectUri, state, handleAuthRequestUrl);
      const codeVerifier = await store.get('codeVerifier');

      expect(result).toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(issuer, clientId, scope, redirectUri, codeVerifier, state, handleAuthRequestUrl);

    });

    it('should throw when no clientId was found in the store', async () => {

      store.get = jest.fn().mockImplementation(
        (key) => key === 'clientId' ? undefined : 'randomValue',
      );

      const result = instance.loginWithIssuer(issuer, scope, redirectUri, state, handleAuthRequestUrl);
      await expect(result).rejects.toThrow('No client_id available in the store');

    });

    it('should throw when no codeVerifier was found in the store', async () => {

      store.get = jest.fn().mockImplementation(
        (key) => key === 'codeVerifier' ? undefined : 'randomValue',
      );

      const result = instance.loginWithIssuer(issuer, scope, redirectUri, state, handleAuthRequestUrl);
      await expect(result).rejects.toThrow('No code verifier available in the store');

    });

    it('should not call initialize when store is already initialized', async () => {

      instance = new SolidOidcClient(store);
      const spy = jest.spyOn((instance as any), 'initialize');
      const result = instance.loginWithIssuer(issuer, scope, redirectUri, state, handleAuthRequestUrl);
      await expect(result).rejects.toThrow(); // Not what we are testing
      expect(spy).toHaveBeenCalledTimes(0);

    });

    const loginWithIssuerParams = { issuer, scope, redirectUri };

    it.each(Object.keys(loginWithIssuerParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

      const testArgs = { ...loginWithIssuerParams };
      testArgs[keyToBeNull] = undefined;

      const result = instance.loginWithIssuer(
        testArgs.issuer,
        testArgs.scope,
        testArgs.redirectUri,
      );

      await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

    });

  });

  describe('loginWithWebId()', () => {

    beforeEach(() => jest.spyOn(clientModule, 'loginWithWebId').mockResolvedValue(undefined));

    it('should call loginWithWebId() with the correct parameters', async () => {

      const spy = jest.spyOn(clientModule, 'loginWithWebId');
      const result = await instance.loginWithWebId(webId, scope, redirectUri, state, handleAuthRequestUrl);
      const codeVerifier = await store.get('codeVerifier');
      expect(result).toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(webId, clientId, scope, redirectUri, codeVerifier, state, handleAuthRequestUrl);

    });

    it('should throw when no clientId was found in the store', async () => {

      store.get = jest.fn().mockImplementation(
        (key) => key === 'clientId' ? undefined : 'randomValue',
      );

      const result = instance.loginWithWebId(webId, scope, redirectUri, state, handleAuthRequestUrl);
      await expect(result).rejects.toThrow('No client_id available in the store');

    });

    it('should throw when no clientId was found in the store', async () => {

      store.get = jest.fn().mockImplementation(
        (key) => key === 'codeVerifier' ? undefined : 'randomValue',
      );

      const result = instance.loginWithWebId(webId, scope, redirectUri, state, handleAuthRequestUrl);
      await expect(result).rejects.toThrow('No code verifier available in the store');

    });

    it('should not call initialize when store is already initialized', async () => {

      instance = new SolidOidcClient(store);
      const spy = jest.spyOn((instance as any), 'initialize');
      const result = instance.loginWithWebId(webId, scope, redirectUri, state, handleAuthRequestUrl);
      await expect(result).rejects.toThrow(); // Not what we are testing
      expect(spy).toHaveBeenCalledTimes(0);

    });

    const loginWithWebIdParams = { webId, scope, redirectUri };

    it.each(Object.keys(loginWithWebIdParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

      const testArgs = { ...loginWithWebIdParams };
      testArgs[keyToBeNull] = undefined;

      const result = instance.loginWithWebId(
        testArgs.webId,
        testArgs.scope,
        testArgs.redirectUri,
      );

      await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

    });

  });

  describe('logout()', () => {

    it('should delete accessToken, refreshToken and idToken from the store', async () => {

      await store.set('accessToken', dummyValidAccessToken);
      await store.set('refreshToken', refreshToken);
      await store.set('idToken', idToken);
      await expect(store.get('accessToken')).resolves.toBe(dummyValidAccessToken);
      await expect(store.get('refreshToken')).resolves.toBe(refreshToken);
      await expect(store.get('idToken')).resolves.toBe(idToken);

      const result = instance.logout();

      await expect(result).resolves.toBeUndefined();
      await expect(store.get('accessToken')).resolves.toBeUndefined();
      await expect(store.get('refreshToken')).resolves.toBeUndefined();
      await expect(store.get('idToken')).resolves.toBeUndefined();

    });

  });

  describe('handleIncomingRedirect()', () => {

    beforeEach(() => jest.spyOn(clientModule, 'handleIncomingRedirect')
      .mockResolvedValue({ accessToken: dummyValidAccessToken, idToken }));

    it('should call handleIncomingRedirect() with the correct parameters', async () => {

      const spy = jest.spyOn(clientModule, 'handleIncomingRedirect');

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);

      await expect(result).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(issuer, clientId, redirectUri, await store.get('codeVerifier'), await store.get('publicKey'), await store.get('privateKey'), getAuthorizationCode, undefined);

    });

    it('should save the tokens to the store', async () => {

      await expect(store.get('accessToken')).resolves.toBeUndefined();
      await expect(store.get('idToken')).resolves.toBeUndefined();
      await expect(store.get('refreshToken')).resolves.toBeUndefined();

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      await expect(result).resolves.toBeUndefined();

      await expect(store.get('accessToken')).resolves.toBe(dummyValidAccessToken);
      await expect(store.get('idToken')).resolves.toBe(idToken);
      await expect(store.get('refreshToken')).resolves.toBeUndefined();

    });

    it('should save the refreshToken to the store if present', async () => {

      jest.spyOn(clientModule, 'handleIncomingRedirect').mockResolvedValueOnce({ accessToken: dummyValidAccessToken, idToken, refreshToken });

      await expect(store.get('refreshToken')).resolves.toBeUndefined();

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      await expect(result).resolves.toBeUndefined();

      await expect(store.get('refreshToken')).resolves.toBe(refreshToken);

    });

    it('should throw when something goes wrong in the try catch', async () => {

      jest.spyOn(clientModule, 'handleIncomingRedirect').mockRejectedValueOnce(undefined);

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);

      await expect(result).rejects.toThrow('An error occurred handling the incoming redirect : ');

    });

    it('should throw when no clientId was found in the store', async () => {

      store.get = jest.fn().mockImplementation(
        (key) => key === 'clientId' ? undefined : 'randomValue',
      );

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      await expect(result).rejects.toThrow('No client_id available in the store');

    });

    it('should throw when no privateKey was found in the store', async () => {

      store.get = jest.fn().mockImplementation(
        (key) => key === 'privateKey' ? undefined : 'randomValue',
      );

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      await expect(result).rejects.toThrow('No private key available in the store');

    });

    it('should throw when no publicKey was found in the store', async () => {

      store.get = jest.fn().mockImplementation(
        (key) => key === 'publicKey' ? undefined : 'randomValue',
      );

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      await expect(result).rejects.toThrow('No public key available in the store');

    });

    it('should throw when no codeVerifier was found in the store', async () => {

      store.get = jest.fn().mockImplementation(
        (key) => key === 'codeVerifier' ? undefined : 'randomValue',
      );

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      await expect(result).rejects.toThrow('No code verifier available in the store');

    });

    it('should save the issuer to the store', async () => {

      await expect(store.get('issuer')).resolves.toBeUndefined();
      await instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      await expect(store.get('issuer')).resolves.toBe(issuer);

    });

    it('should save the clientSecret to the store if present', async () => {

      await expect(store.get('clientSecret')).resolves.toBeUndefined();
      await instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode, clientSecret);
      await expect(store.get('clientSecret')).resolves.toBe(clientSecret);

    });

    it('should not call initialize when store is already initialized', async () => {

      instance = new SolidOidcClient(store);
      const spy = jest.spyOn((instance as any), 'initialize');
      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      await expect(result).rejects.toThrow(); // Not what we are testing
      expect(spy).toHaveBeenCalledTimes(0);

    });

    const handleIncomingRedirectParams = { issuer, redirectUri };

    it.each(Object.keys(handleIncomingRedirectParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

      const testArgs = { ...handleIncomingRedirectParams };
      testArgs[keyToBeNull] = undefined;

      const result = instance.handleIncomingRedirect(
        testArgs.issuer,
        testArgs.redirectUri,
      );

      await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

    });

  });

  describe('accessResource()', () => {

    beforeEach(() => store.set('accessToken', dummyValidAccessToken));
    beforeEach(() => jest.spyOn(oidcModule, 'accessResource').mockResolvedValue(undefined));

    it('should call accessResource with the correct parameters', async () => {

      const spy = jest.spyOn(oidcModule, 'accessResource');

      const result = instance.accessResource(resource, method);

      await expect(result).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(resource, method, dummyValidAccessToken, await store.get('publicKey'), await store.get('privateKey'), undefined, undefined);

    });

    it('should throw when something goes wrong in the try catch', async () => {

      await store.set('accessToken', 'WontBeAbleToParse');
      const result = instance.accessResource(resource, method);
      await expect(result).rejects.toThrow(`An error occurred trying to access resource ${resource} : `);

    });

    it('should throw when no publicKey was found in the store', async () => {

      store.get = jest.fn().mockImplementation(
        (key) => key === 'publicKey' ? undefined : 'randomValue',
      );

      const result = instance.accessResource(resource, method);
      await expect(result).rejects.toThrow('No public key available in the store');

    });

    it('should throw when no privateKey was found in the store', async () => {

      store.get = jest.fn().mockImplementation(
        (key) => key === 'privateKey' ? undefined : 'randomValue',
      );

      const result = instance.accessResource(resource, method);
      await expect(result).rejects.toThrow('No private key available in the store');

    });

    it('should throw when no accessToken was found in the store', async () => {

      await store.delete('accessToken');
      const result = instance.accessResource(resource, method);
      await expect(result).rejects.toThrow('No accessToken available, did you login correctly?');

    });

    it('should not call initialize when store is already initialized', async () => {

      instance = new SolidOidcClient(store);
      const spy = jest.spyOn((instance as any), 'initialize');
      const result = instance.accessResource(resource, method);
      await expect(result).rejects.toThrow(); // Not what we are testing
      expect(spy).toHaveBeenCalledTimes(0);

    });

    const accessResourceParams = { resource, method };

    it.each(Object.keys(accessResourceParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

      const testArgs = { ...accessResourceParams };
      testArgs[keyToBeNull] = undefined;

      const result = instance.accessResource(
        testArgs.resource,
        testArgs.method as HttpMethod,
      );

      await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

    });

    describe('When accessToken is expired', () => {

      beforeEach(async () => {

        await store.set('accessToken', dummyExpiredAccessToken);
        await store.set('issuer', issuer);
        await store.set('refreshToken', refreshToken);
        jest.spyOn(oidcModule, 'refreshTokenRequest').mockResolvedValue({ accessToken: dummyValidAccessToken, refreshToken, idToken });

        return;

      });

      it('should call refreshTokenRequest() with the correct parameters', async () => {

        const spy = jest.spyOn(oidcModule, 'refreshTokenRequest');
        const result = instance.accessResource(resource, method);
        await expect(result).resolves.toBeUndefined();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(issuer, clientId, refreshToken, await store.get('publicKey'), await store.get('privateKey'), undefined);

      });

      it('should save the new accessToken, idToken and refreshToken to the store', async () => {

        const result = instance.accessResource(resource, method);
        await expect(result).resolves.toBeUndefined();
        await expect(store.get('accessToken')).resolves.toBe(dummyValidAccessToken);
        await expect(store.get('refreshToken')).resolves.toBe(refreshToken);
        await expect(store.get('idToken')).resolves.toBe(idToken);

      });

      it('should throw when no refreshToken was found in the store', async () => {

        await store.delete('refreshToken');
        const result = instance.accessResource(resource, method);
        await expect(result).rejects.toThrow('No refreshToken available, did you login with "offline_access" in the scope?');

      });

      it('should throw when no issuer was found in the store', async () => {

        await store.delete('issuer');
        const result = instance.accessResource(resource, method);
        await expect(result).rejects.toThrow('No issuer available, did you login correctly?');

      });

      it('should throw when no clientId was found in the store', async () => {

        store.get = jest.fn().mockImplementation(
          (key) => key === 'clientId' ? undefined : key === 'accessToken' ? dummyExpiredAccessToken : 'randomValue',
        );

        const result = instance.accessResource(resource, method);
        await expect(result).rejects.toThrow('No client_id available in the store');

      });

    });

  });

});
