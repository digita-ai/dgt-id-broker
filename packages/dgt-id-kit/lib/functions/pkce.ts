import CryptoJS from 'crypto-js';
// import { store } from './storage';

export const generateCodeVerifier = async (length: number): Promise<string> => {

  if (!length) { throw new Error('Parameter "length" should be set'); }

  if (length < 43) { throw new Error('A PKCE code_verifier has to be at least 43 characters long'); }

  let codeVerifier = '';
  const possibleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

  for (let i = 0; i < length; i++) {

    codeVerifier += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));

  }

  // await store.set('codeVerifier', codeVerifier);

  return codeVerifier;

};

export const generateCodeChallenge = (codeVerifier: string): string => {

};

export const base64UrlEncode = (string: string): string => {

  if (!string) { throw new Error('Parameter "string" should be set'); }

  const hash = CryptoJS.SHA256(string);

  return hash.toString(CryptoJS.enc.Base64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

};
