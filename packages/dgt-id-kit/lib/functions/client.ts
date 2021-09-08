import { JWK } from 'jose/webcrypto/types';
import { defaultGetAuthorizationCode, defaultHandleAuthRequestUrl } from '../solid-oidc-client/solid-oidc-client';
import { getFirstIssuerFromWebId } from './web-id';
import { authRequest, tokenRequest, tokenRequestReturnObject } from './oidc';

export const loginWithIssuer = async (
  issuer: string,
  clientId: string,
  scope: string,
  redirectUri: string,
  codeVerifier: string,
  handleAuthRequestUrl: (requestUrl: string) => Promise<void> = defaultHandleAuthRequestUrl,
): Promise<void> => {

  if (!issuer) throw new Error('Parameter "issuer" should be set');
  if (!clientId) throw new Error('Parameter "clientId" should be set');
  if (!scope) throw new Error('Parameter "scope" should be set');
  if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');
  if (!codeVerifier) throw new Error('Parameter "codeVerifier" should be set');

  await authRequest(issuer, clientId, scope, redirectUri, codeVerifier, handleAuthRequestUrl);

};

export const loginWithWebId = async (
  webId: string,
  clientId: string,
  scope: string,
  redirectUri: string,
  codeVerifier: string,
  handleAuthRequestUrl: (requestUrl: string) => Promise<void> = defaultHandleAuthRequestUrl,
): Promise<void> => {

  if (!webId) throw new Error('Parameter "webId" should be set');
  if (!clientId) throw new Error('Parameter "clientId" should be set');
  if (!scope) throw new Error('Parameter "scope" should be set');
  if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');
  if (!codeVerifier) throw new Error('Parameter "codeVerifier" should be set');

  const issuer = await getFirstIssuerFromWebId(webId);

  if (!issuer) throw new Error(`No issuer was found on the profile of ${webId}`);

  await loginWithIssuer(issuer.url.toString(), clientId, scope, redirectUri, codeVerifier, handleAuthRequestUrl);

};

export const handleIncomingRedirect = async (
  issuer: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
  publicKey: JWK,
  privateKey: JWK,
  getAuthorizationCode: () => Promise<string|null> = defaultGetAuthorizationCode,
  clientSecret?: string,
): Promise<tokenRequestReturnObject> => {

  if (!issuer) throw new Error('Parameter "issuer" should be set');
  if (!clientId) throw new Error('Parameter "clientId" should be set');
  if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');
  if (!codeVerifier) throw new Error('Parameter "codeVerifier" should be set');
  if (!publicKey) throw new Error('Parameter "publicKey" should be set');
  if (!privateKey) throw new Error('Parameter "privateKey" should be set');

  const code = await getAuthorizationCode();
  if (!code) throw new Error(`No authorization code was found, make sure you provide the correct function!`);

  try {

    return await tokenRequest(issuer, clientId, code, redirectUri, codeVerifier, publicKey, privateKey, clientSecret);

  } catch (error: unknown) {

    throw new Error(`An error occurred handling the incoming redirect : ${error}`);

  }

};
