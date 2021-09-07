// Fix to be able to run tests in jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { JWK } from 'jose/webcrypto/types';
import { HttpMethod } from '../models/http-method.model';
import { TypedKeyValueStore } from '../models/typed-key-value-store.model';
import { clientId, handleAuthRequestUrl, redirectUri, resource, method, issuer, scope, responseType, webId, dummyValidAccessToken, refreshToken, idToken, clientSecret, dummyExpiredAccessToken, getAuthorizationCode } from '../../test/test-data';
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

  beforeEach(async (done) => {

    store = new testStore();
    instance = new SolidOidcClient(store);
    await instance.initialize(clientId);
    done();

  });

  describe('constructor()', () => {

    it('should set the given store to this.store', async () => {

      expect((instance as any).store).toEqual(store);

    });

  });

  describe('initialize()', () => {

    it('should create a public key, private key and a codeVerifier and set it to the store', async () => {

      await expect(store.get('publicKey')).resolves.toBeDefined();
      await expect(store.get('privateKey')).resolves.toBeDefined();
      await expect(store.get('codeVerifier')).resolves.toBeDefined();

    });

    it('should set the provided clientId to the store', async () => {

      await expect(store.get('clientId')).resolves.toBe(clientId);

    });

    it('should not overwrite the pubkey, privkey or codeverifier when already present in the store', async () => {

      const originalPubkey = await store.get('publicKey');
      const originalPrivkey = await store.get('privateKey');
      const originalCodeVerifier = await store.get('codeVerifier');

      await instance.initialize(clientId);

      await expect(store.get('publicKey')).resolves.toEqual(originalPubkey);
      await expect(store.get('privateKey')).resolves.toEqual(originalPrivkey);
      await expect(store.get('codeVerifier')).resolves.toBe(originalCodeVerifier);

    });

  });

  describe('loginWithIssuer()', () => {

    it('should call authRequest() with the right parameters', async () => {

      const spy = jest.spyOn(clientModule, 'loginWithIssuer').mockResolvedValueOnce(undefined);

      const result = instance.loginWithIssuer(issuer, scope, responseType, handleAuthRequestUrl);

      await expect(result).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(issuer, clientId, scope, responseType, handleAuthRequestUrl);

    });

    it ('should throw when no clientId was found in the store', async () => {

      await store.delete('clientId');

      const result = instance.loginWithIssuer(issuer, scope, responseType, handleAuthRequestUrl);
      const expectedErrorMessage: string = (instance as any).getInitializeError('clientId').message;
      await expect(result).rejects.toThrow(expectedErrorMessage);

    });

    const loginWithIssuerParams = { issuer, scope, responseType };

    it.each(Object.keys(loginWithIssuerParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

      const testArgs = { ...loginWithIssuerParams };
      testArgs[keyToBeNull] = undefined;

      const result = instance.loginWithIssuer(
        testArgs.issuer,
        testArgs.scope,
        testArgs.responseType,
      );

      await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

    });

  });

  describe('loginWithWebId()', () => {

    beforeEach(() => jest.spyOn(clientModule, 'loginWithWebId').mockResolvedValue(undefined));

    it('should call loginWithWebId() with the correct parameters', async () => {

      const spy = jest.spyOn(clientModule, 'loginWithWebId');
      const result = instance.loginWithWebId(webId, scope, responseType, handleAuthRequestUrl);
      await expect(result).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(webId, clientId, scope, responseType, handleAuthRequestUrl);

    });

    it ('should throw when no clientId was found in the store', async () => {

      await store.delete('clientId');

      const result = instance.loginWithWebId(webId, scope, responseType, handleAuthRequestUrl);
      const expectedErrorMessage: string = (instance as any).getInitializeError('clientId').message;
      await expect(result).rejects.toThrow(expectedErrorMessage);

    });

    const loginWithWebIdParams = { webId, scope, responseType };

    it.each(Object.keys(loginWithWebIdParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

      const testArgs = { ...loginWithWebIdParams };
      testArgs[keyToBeNull] = undefined;

      const result = instance.loginWithWebId(
        testArgs.webId,
        testArgs.scope,
        testArgs.responseType,
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

      await store.delete('clientId');

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      const expectedErrorMessage: string = (instance as any).getInitializeError('clientId').message;
      await expect(result).rejects.toThrow(expectedErrorMessage);

    });

    it('should throw when no publicKey was found in the store', async () => {

      await store.delete('publicKey');

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      const expectedErrorMessage: string = (instance as any).getInitializeError('publicKey').message;
      await expect(result).rejects.toThrow(expectedErrorMessage);

    });

    it('should throw when no privateKey was found in the store', async () => {

      await store.delete('privateKey');

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      const expectedErrorMessage: string = (instance as any).getInitializeError('privateKey').message;
      await expect(result).rejects.toThrow(expectedErrorMessage);

    });

    it('should throw when no codeVerifier was found in the store', async () => {

      await store.delete('codeVerifier');

      const result = instance.handleIncomingRedirect(issuer, redirectUri, getAuthorizationCode);
      const expectedErrorMessage: string = (instance as any).getInitializeError('codeVerifier').message;
      await expect(result).rejects.toThrow(expectedErrorMessage);

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

      await store.delete('publicKey');

      const result = instance.accessResource(resource, method);
      const expectedErrorMessage: string = (instance as any).getInitializeError('publicKey').message;
      await expect(result).rejects.toThrow(expectedErrorMessage);

    });

    it('should throw when no privateKey was found in the store', async () => {

      await store.delete('privateKey');

      const result = instance.accessResource(resource, method);
      const expectedErrorMessage: string = (instance as any).getInitializeError('privateKey').message;
      await expect(result).rejects.toThrow(expectedErrorMessage);

    });

    it('should throw when no accessToken was found in the store', async () => {

      await store.delete('accessToken');
      const result = instance.accessResource(resource, method);
      await expect(result).rejects.toThrow('No accessToken available, did you login correctly?');

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

      beforeEach(() => store.set('accessToken', dummyExpiredAccessToken));
      beforeEach(() => store.set('issuer', issuer));
      beforeEach(() => store.set('refreshToken', refreshToken));
      beforeEach(() => jest.spyOn(oidcModule, 'refreshTokenRequest').mockResolvedValue({ accessToken: dummyValidAccessToken, refreshToken, idToken }));

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

        await store.delete('clientId');
        const result = instance.accessResource(resource, method);
        const expectedErrorMessage: string = (instance as any).getInitializeError('clientId').message;
        await expect(result).rejects.toThrow(expectedErrorMessage);

      });

    });

  });

  describe('getInitializeError()', () => {

    it('should return an error with the correct message', async () => {

      expect((instance as any).getInitializeError('test'))
        .toEqual(new Error('No test was found, did you call initialize()?'));

    });

  });

});
