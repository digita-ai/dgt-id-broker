import { base64UrlEncode, generateCodeChallenge, generateCodeVerifier } from './pkce';

describe('generateCodeVerifier()', () => {

  it('should return a code verifier of the desired length', async () => {

    expect(generateCodeVerifier(100)).toHaveLength(100);
    expect(generateCodeVerifier(70)).toHaveLength(70);

  });

  it('should return a code verifier that only contains valid code verifier characters', async () => {

    const result = generateCodeVerifier(100);
    expect(result).toBeDefined();

    // eslint-disable-next-line no-useless-escape
    const regex = /^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\-\.\_\~]{43,128}$/;
    expect(regex.test(result)).toBe(true);

  });

  it('should throw when parameter length is undefined', async () => {

    expect(() => generateCodeVerifier(undefined)).toThrow('Parameter "length" should be set');

  });

  it('should throw when parameter length is less than 43', async () => {

    expect(() => generateCodeVerifier(42)).toThrow('A PKCE code_verifier has to be at least 43 characters long');

  });

  it('should throw when parameter length is greater than 128', async () => {

    expect(() => generateCodeVerifier(129)).toThrow('A PKCE code_verifier can not contain more than 128 characters');

  });

});

describe('generateCodeChallenge()', () => {

  it('should return the right code challenge', async () => {

    const result = generateCodeChallenge('ABCDEFGHIJKLNMOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
    expect(result).toBe('AXtY816us6WnkZW6XWpJUg4GeB9rsKb9-_ZefTqm66U');

  });

  it('should throw when parameter codeVerifier is undefined', async () => {

    expect(() => generateCodeChallenge(undefined)).toThrow('Parameter "codeVerifier" should be set');

  });

  it('should throw when parameter codeVerifier has less than 43 characters', async () => {

    expect(() => generateCodeChallenge('short')).toThrow('A PKCE code_verifier has to be at least 43 characters long');

  });

  it('should throw when parameter length is greater than 128', async () => {

    const temp = 'longlonglonglonglonglonglonglong';
    const string = temp + temp + temp + temp + temp + temp;
    expect(() => generateCodeChallenge(string)).toThrow('A PKCE code_verifier can not contain more than 128 characters');

  });

});

describe('base64UrlEncode()', () => {

  it('should return the base64 encoded string of the given string', async () => {

    expect(base64UrlEncode('string')).toBe('RzKH-CmNunFjqJeQiVj3wOrnM-JdLgJ5kuou3JvtL6g');

  });

  it('should throw when parameter string is undefined', async () => {

    expect(() => base64UrlEncode(undefined)).toThrow('Parameter "string" should be set');

  });

});
