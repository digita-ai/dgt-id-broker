import { base64UrlEncode, generateCodeVerifier } from './pkce';
import { store } from './storage';

describe('generateCodeVerifier()', () => {

  it('should return a code verifier of the desired length', async () => {

    const result = generateCodeVerifier(100);
    await expect(result).resolves.toHaveLength(100);

    const result2 = generateCodeVerifier(200);
    await expect(result2).resolves.toHaveLength(200);

  });

  it('should save the code verifier to the store', async () => {

    const result = await generateCodeVerifier(50);
    const inStore = await store.get('codeVerifier');
    expect(inStore).toBeDefined();
    expect(inStore).toBe(result);
    await expect(store.has('codeVerifier')).resolves.toBe(true);

  });

  it('should return a code verifier that only contains valid code verifier characters', async () => {

    const result = await generateCodeVerifier(100);
    expect(result).toBeDefined();

    const regex = /^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\-\.\_\~]+$/;
    expect(regex.test(result)).toBe(true);

  });

  it('should throw when parameter length is undefined', async () => {

    const result = generateCodeVerifier(undefined);
    await expect(result).rejects.toThrow('Parameter "length" should be set');

  });

  it('should throw when parameter length is less than 43', async () => {

    const result = generateCodeVerifier(42);
    await expect(result).rejects.toThrow('A PKCE code_verifier has to be at least 43 characters long');

  });

});

describe('generateCodeChallenge()', () => {

});

describe('base64UrlEncode()', () => {

  it('should return the base64 encoded string of the given string', async () => {

    expect(base64UrlEncode('string')).toBe('RzKH-CmNunFjqJeQiVj3wOrnM-JdLgJ5kuou3JvtL6g');

  });

  it('should throw when parameter string is undefined', async () => {

    expect(() => base64UrlEncode(undefined)).toThrow('Parameter "string" should be set');

  });

});
