// Fix to be able to run tests in jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
import * as jose from 'jose';
import { JWK } from 'jose';
import { createDpopProof, generateKeys } from './dpop';

beforeEach(() => jest.clearAllMocks());

describe('createDPoPProof()', () => {

  let publicKey: JWK;
  let privateKey: JWK;

  const helper = async () => {

    const testKeys = await generateKeys();
    publicKey = testKeys.publicKey;
    privateKey = testKeys.privateKey;

  };

  beforeEach(() => helper());

  it('should return a DPoP proof', async () => {

    const result = createDpopProof('htm', 'htu', publicKey, privateKey);
    await expect(result).resolves.toBeDefined();

    const header = JSON.parse(atob((await result).split('.')[0]));
    const payload = JSON.parse(atob((await result).split('.')[1]));

    expect(header.alg).toBeDefined();
    expect(header.jwk).toBeDefined();
    expect(payload.htm).toBe('htm');
    expect(payload.htu).toBe('htu');

  });

  it('should remove the hash of the htu when present', async () => {

    const result = createDpopProof('htm', 'https://example.com/test/profile/card#me', publicKey, privateKey);
    await expect(result).resolves.toBeDefined();

    const payload = JSON.parse(atob((await result).split('.')[1]));

    expect(payload.htu).toBe('https://example.com/test/profile/card');

  });

  it('should throw when something goes wrong signing the JWT', async () => {

    jest.spyOn(jose, 'importJWK').mockRejectedValueOnce(undefined);
    const result = createDpopProof('htm', 'htu', publicKey, privateKey);
    await expect(result).rejects.toThrow('An error occurred while creating a DPoP proof: ');

  });

  const createDpopProofParams = { htm: 'htm', htu: 'htu', publicKey: {}, privateKey: {} };

  it.each(Object.keys(createDpopProofParams))('should throw when parameter %s is undefined', async (keyToBeNull) => {

    const testArgs = { ...createDpopProofParams };
    testArgs[keyToBeNull] = undefined;

    const result = createDpopProof(
      testArgs.htm,
      testArgs.htu,
      testArgs.publicKey,
      testArgs.privateKey,
    );

    await expect(result).rejects.toThrow(`Parameter "${keyToBeNull}" should be set`);

  });

  it('should throw when publicKey does not have an alg', async () => {

    await expect(createDpopProof('htm', 'htu', { alg: undefined }, privateKey)).rejects.toThrow('Parameter "publicKey.alg" should be set');

  });

});

describe('generateKeys()', () => {

  it('should return both the private and the public key', async () => {

    const result = generateKeys();
    await expect(result).resolves.toBeDefined();
    const awaitedRsult = await result;
    expect(awaitedRsult.privateKey).toBeDefined();
    expect(awaitedRsult.publicKey).toBeDefined();

  });

  it('should use ES256 algorithm by default', async () => {

    const spy = jest.spyOn(jose, 'generateKeyPair');

    const result = generateKeys();
    await expect(result).resolves.toBeDefined();

    const awaitedResult = await result;
    expect(awaitedResult.publicKey.alg).toBe('ES256');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('ES256', { extractable: true });

  });

  it('should use the algorithm provided by the user', async () => {

    const spy = jest.spyOn(jose, 'generateKeyPair');

    const result = generateKeys('ES512');
    await expect(result).resolves.toBeDefined();

    const awaitedResult = await result;
    expect(awaitedResult.publicKey.alg).toBe('ES512');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('ES512', { extractable: true });

  });

  it('should throw when something goes wrong', async () => {

    jest.spyOn(jose, 'generateKeyPair').mockRejectedValueOnce(undefined);

    const result = generateKeys();
    await expect(result).rejects.toThrow('An error occurred while generating keys with algorithm ES256');

  });

});
