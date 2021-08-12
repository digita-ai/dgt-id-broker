// Fix to be able to run tests in jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import * as generateKeyPairSpy from 'jose/util/generate_key_pair';
import { store } from './storage';
import { createDPoPProof, generateKeys } from './dpop';

beforeEach(() => {

  jest.clearAllMocks();

});

// Tthis describe block NEEDS to be above the other one, if they are switched,
// for some reason, you wont be able to set new values in the store.
// If the person reading this code has any idea why, let me know.
describe('createDPoPProof()', () => {

  // populate the store with fresh keys for every test
  beforeEach(() => generateKeys());

  it('should return a DPoP proof', async () => {

    const result = createDPoPProof('htm', 'htu');
    await expect(result).resolves.toBeDefined();

    const header = JSON.parse(atob((await result).split('.')[0]));
    const payload = JSON.parse(atob((await result).split('.')[1]));

    expect(header.alg).toBeDefined();
    expect(header.jwk).toBeDefined();
    expect(payload.htm).toBe('htm');
    expect(payload.htu).toBe('htu');

  });

  it('should throw when parameter htm is undefined', async () => {

    const result = createDPoPProof(undefined, 'htu');
    await expect(result).rejects.toThrow('Parameter "htm" should be set');

  });

  it('should throw when parameter htu is undefined', async () => {

    const result = createDPoPProof('htm', undefined);
    await expect(result).rejects.toThrow('Parameter "htu" should be set');

  });

  it('should throw when no private key was found in the store', async () => {

    await store.delete('privateKey');
    const result = createDPoPProof('htm', 'htu');
    await expect(result).rejects.toThrow('No private key was found in the store, call generateKeys()');

  });

  it('should throw when no public key was found in the store', async () => {

    await store.delete('publicKey');
    const result = createDPoPProof('htm', 'htu');
    await expect(result).rejects.toThrow('No public key was found in the store, call generateKeys()');

  });

  it('should throw when something goes wrong signing the JWT', async () => {

    await store.set('publicKey', { ...(await store.get('publicKey')), alg: undefined });
    const result = createDPoPProof('htm', 'htu');
    await expect(result).rejects.toThrow('An error occurred while creating a DPoP proof: ');

  });

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

    const result = generateKeys('ES512');
    await expect(result).resolves.toBeUndefined();

    await result;

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('ES512');

    const publicKey = await store.get('publicKey');
    expect(publicKey.alg).toBe('ES512');

  });

  it('should throw when something goes wrong', async () => {

    store.set = jest.fn().mockRejectedValueOnce(undefined);

    const result = generateKeys();
    await expect(result).rejects.toThrow('An error occurred while generating keys with algorithm ES256');

  });

});
