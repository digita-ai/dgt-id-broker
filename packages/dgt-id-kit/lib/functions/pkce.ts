import CryptoJS from 'crypto-js';
import { store } from './storage';

/**
 * generate a PKCE code verifier with a desired length and save it to the store
 *
 * @param length the desired length of the code verifier
 * @returns the generate code verifier
 */
export const generateCodeVerifier = async (length: number): Promise<string> => {

  if (!length) { throw new Error('Parameter "length" should be set'); }

  if (length < 43) { throw new Error('A PKCE code_verifier has to be at least 43 characters long'); }

  let codeVerifier = '';
  const possibleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

  for (let i = 0; i < length; i++) {

    codeVerifier += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));

  }

  await store.set('codeVerifier', codeVerifier);

  return codeVerifier;

};

/**
 * base64 encode a string using CryptoJS
 *
 * @param string the string you wish to encode
 * @returns the encoded string
 */
export const base64UrlEncode = (string: string): string => {

  if (!string) { throw new Error('Parameter "string" should be set'); }

  const hash = CryptoJS.SHA256(string);

  return hash.toString(CryptoJS.enc.Base64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

};

/**
 * generate a code challenge base on a (valid) given code verifier string
 *
 * @param codeVerifier the code verifier you wish to generate a code challenge for
 * @returns a string containing the code challange
 */
export const generateCodeChallenge = (codeVerifier: string): string => {

  if (!codeVerifier) { throw new Error('Parameter "codeVerifier" should be set'); }

  if (codeVerifier.length < 43) { throw new Error('A PKCE code_verifier has to be at least 43 characters long'); }

  return base64UrlEncode(codeVerifier);

};
