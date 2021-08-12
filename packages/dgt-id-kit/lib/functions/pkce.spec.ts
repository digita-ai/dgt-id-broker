import { base64UrlEncode } from './pkce';

describe('generateCodeVerifier()', () => {

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
