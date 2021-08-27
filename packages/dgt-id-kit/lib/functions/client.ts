import { store } from './storage';
import { getFirstIssuerFromWebId } from './web-id';
import { authRequest, tokenRequest } from './oidc';

export const loginWithIssuer = async (
  issuer: string,
  clientId: string,
  scope: string,
  responseType: string,
): Promise<void> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!scope) { throw new Error('Parameter "scope" should be set'); }

  if (!responseType) { throw new Error('Parameter "responseType" should be set'); }

  await authRequest(issuer, clientId, scope, responseType);

};

export const loginWithWebId = async (
  webId: string,
  clientId: string,
  scope: string,
  responseType: string,
): Promise<void> => {

  if (!webId) { throw new Error('Parameter "webId" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!scope) { throw new Error('Parameter "scope" should be set'); }

  if (!responseType) { throw new Error('Parameter "responseType" should be set'); }

  const issuer = await getFirstIssuerFromWebId(webId);

  if (!issuer) { throw new Error(`No issuer was found on the profile of ${webId}`); }

  await loginWithIssuer(issuer.url.toString(), clientId, scope, responseType);

};

export const logout = async (): Promise<void> => {

  await store.delete('accessToken');
  await store.delete('idToken');
  await store.delete('refreshToken');

};

export const handleIncomingRedirect = async (
  issuer: string,
  clientId: string,
  redirectUri: string,
  clientSecret?: string,
): Promise<void> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!redirectUri) { throw new Error('Parameter "redirectUri" should be set'); }

  const code = new URLSearchParams(window.location.search).get('code');

  if (!code) { throw new Error(`No authorization code was found in window.location.search : ${window.location.search}`); }

  try {

    await store.set('issuer', issuer);
    await store.set('clientId', clientId);

    if (clientSecret) { await store.set('clientSecret', clientSecret); }

    await tokenRequest(issuer, clientId, code, redirectUri, clientSecret);

  } catch (error: unknown) {

    throw new Error(`An error occurred handling the incoming redirect : ${error}`);

  }

};
