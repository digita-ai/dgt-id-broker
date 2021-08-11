// Fix to be able to run tests in jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import * as generateKeyPairSpy from 'jose/util/generate_key_pair';
import { store } from './storage';
import { generateKeys } from './dpop';

enableFetchMocks();

beforeEach(() => {

  fetchMock.resetMocks();
  jest.clearAllMocks();

});

describe('generateKeys()', () => {

  it('should add both keys to the store', async () => {

    const result = generateKeys();
    await expect(result).resolves.toBeUndefined();
    await result;
    expect(await store.has('privateKey')).toBe(true);
    expect(await store.has('publicKey')).toBe(true);

  });

  it('should use ES256 algorithm by default', async () => {

    const spy = jest.spyOn(generateKeyPairSpy, 'generateKeyPair');

    const result = generateKeys();
    await expect(result).resolves.toBeUndefined();

    await result;

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('ES256');

    const publicKey = await store.get('publicKey');
    expect(publicKey.alg).toBe('ES256');

  });

  it('should use the algorithm provided by the user', async () => {

    const spy = jest.spyOn(generateKeyPairSpy, 'generateKeyPair');

    const result = generateKeys('ECDH-ES+A128KW');
    await expect(result).resolves.toBeUndefined();

    await result;

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('ECDH-ES+A128KW');

    const publicKey = await store.get('publicKey');
    expect(publicKey.alg).toBe('ECDH-ES+A128KW');

  });

  it('should throw when something goes wrong', async () => {

    store.set = jest.fn().mockRejectedValueOnce(undefined);

    const result = generateKeys();
    await expect(result).rejects.toThrow('An error occurred while generating keys with algorithm ES256');

  });

});

describe('createDPoPProof()', () => {

});
