import { JWK } from 'jose/types';
import { defaultGetAuthorizationCode, defaultHandleAuthRequestUrl } from '../solid-oidc-client/solid-oidc-client';
import { getFirstIssuerFromWebId } from './web-id';
import { authRequest, tokenRequest, tokenRequestReturnObject } from './oidc';

/**
 * Logs the client in using an issuer.
 * Checks if all necessary parameters are present and performs an authentication request.
 *
 * @param { string } issuer - The clients Solid OIDC issuer.
 * @param { string } clientId - The clients client id.
 * @param { string } scope - The scope of the request.
 * @param { string } redirectUri - The uri to redirect the response to.
 * @param { string } codeChallenge - The code challenge to use.
 * @param { string } state? - The state of the request.
 * @param { Promise<void> } handleAuthRequestUrl - The authentication request url.
 */
export const loginWithIssuer = async (
  issuer: string,
  clientId: string,
  scope: string,
  redirectUri: string,
  codeChallenge: string,
  state?: string,
  handleAuthRequestUrl: (requestUrl: string) => Promise<void> = defaultHandleAuthRequestUrl,
): Promise<void> => {

  if (!issuer) throw new Error('Parameter "issuer" should be set');
  if (!clientId) throw new Error('Parameter "clientId" should be set');
  if (!scope) throw new Error('Parameter "scope" should be set');
  if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');
  if (!codeChallenge) throw new Error('Parameter "codeChallenge" should be set');

  await authRequest(issuer, clientId, scope, redirectUri, codeChallenge, state, handleAuthRequestUrl);

};

/**
 * Logs the client in using a web id.
 * Checks if all necessary parameters are present and retrieves the first issuer from the web id.
 * Performs a login with Issuer request using the retrieved issuer from the web id.
 *
 * @param { string } issuer - The clients Solid OIDC issuer.
 * @param { string } clientId - The clients client id.
 * @param { string } scope - The scope of the request.
 * @param { string } redirectUri - The uri to redirect the response to.
 * @param { string } codeChallenge - The code challenge to use.
 * @param { string } state? - The state of the request.
 * @param { Promise<void> } handleAuthRequestUrl - The authentication request url.
 */
export const loginWithWebId = async (
  webId: string,
  clientId: string,
  scope: string,
  redirectUri: string,
  codeChallenge: string,
  state?: string,
  handleAuthRequestUrl: (requestUrl: string) => Promise<void> = defaultHandleAuthRequestUrl,
): Promise<void> => {

  if (!webId) throw new Error('Parameter "webId" should be set');
  if (!clientId) throw new Error('Parameter "clientId" should be set');
  if (!scope) throw new Error('Parameter "scope" should be set');
  if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');
  if (!codeChallenge) throw new Error('Parameter "codeChallenge" should be set');

  const issuer = await getFirstIssuerFromWebId(webId);

  if (!issuer) throw new Error(`No issuer was found on the profile of ${webId}`);

  await loginWithIssuer(
    issuer.url.toString(), clientId, scope, redirectUri, codeChallenge, state, handleAuthRequestUrl
  );

};

/**
 * Handles the incoming redirect.
 * Checks all necessary parameters are present and gets an authorization code.
 * Performs a token request using the authorization code and the given parameters.
 *
 * @param { string } issuer - The clients Solid OIDC issuer.
 * @param { string } clientId - The clients client id.
 * @param { string } redirectUri - The uri to redirect the response to.
 * @param { string } codeVerifier - The code verifier to use.
 * @param { JWK } publicKey - The public JWK to use.
 * @param { JWK } privateKey - The private JWK to use.
 * @param { Promise<string|null> } getAuthorizationCode - The authorization code.
 * @param { string } clientSecret? - The clients secret.
 */
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
