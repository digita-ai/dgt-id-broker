import { store } from './storage';
import { getFirstIssuerFromWebId } from './web-id';
// import { authRequest, tokenRequest } from './oidc';

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

  // await authRequest(issuer, clientId, scope, responseType);

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

  if (await store.has('accessToken')) { await store.delete('accessToken'); }

  if (await store.has('idToken')) { await store.delete('idToken'); }

  if (await store.has('refreshToken')) { await store.delete('refreshToken'); }

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

};
