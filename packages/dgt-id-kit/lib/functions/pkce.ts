import CryptoJS from 'crypto-js';

export const generateCodeVerifier = (length: number): string => {

};

export const generateCodeChallenge = (codeVerifier: string): string => {

};

export const base64UrlEncode = (string: string): string => {

  if (!string) { throw new Error('Parameter "string" should be set'); }

  const hash = CryptoJS.SHA256(string);

  return hash.toString(CryptoJS.enc.Base64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

};
