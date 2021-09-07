import { JWK } from 'jose/webcrypto/types';
import { validateAndFetch } from '../util/validate-and-fetch';
import { HttpMethod } from '../models/http-method.model';
import { defaultHandleAuthRequestUrl } from '../solid-oidc-client/solid-oidc-client';
import { createDpopProof } from './dpop';
import { getEndpoint } from './issuer';
import { generateCodeChallenge, generateCodeVerifier } from './pkce';

/**
 * Construct an authentication request url based on the given parameters
 *
 * @param issuer the issuer url
 * @param clientId the client id
 * @param pkceCodeChallenge the PKCE code challenge
 * @param scope the scope of the request
 * @param redirectUri the redirect uri
 * @returns the constructed authentication request url
 */
export const constructAuthRequestUrl = async (
  issuer: string,
  clientId: string,
  pkceCodeChallenge: string,
  scope: string,
  redirectUri: string,
): Promise<string> => {

  if (!issuer) throw new Error('Parameter "issuer" should be set');
  if (!clientId) throw new Error('Parameter "clientId" should be set');
  if (!pkceCodeChallenge) throw new Error('Parameter "pkceCodeChallenge" should be set');
  if (!scope) throw new Error('Parameter "scope" should be set');
  if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');

  const authorizationEndpoint = await getEndpoint(issuer, 'authorization_endpoint');

  if (!authorizationEndpoint) throw new Error(`No authorization endpoint was found for issuer ${issuer}`);

  return `${authorizationEndpoint}?` +
    `client_id=${clientId}&` +
    `code_challenge=${pkceCodeChallenge}&` +
    `code_challenge_method=S256&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;

};

/**
 * Perform an auth request to the given issuer
 *
 * @param issuer the issuer url
 * @param clientId the client id
 * @param scope the scope of the request
 * @param redirectUri the redirect uri
 */
export const authRequest = async (
  issuer: string,
  clientId: string,
  scope: string,
  redirectUri: string,
  handleAuthRequestUrl: (requestUrl: string) => Promise<void> = defaultHandleAuthRequestUrl,
): Promise<void> => {

  if (!issuer) throw new Error('Parameter "issuer" should be set');
  if (!clientId) throw new Error('Parameter "clientId" should be set');
  if (!scope) throw new Error('Parameter "scope" should be set');
  if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');

  try {

    const codeVerifier = generateCodeVerifier(128);
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const requestUrl = await constructAuthRequestUrl(
      issuer,
      clientId,
      codeChallenge,
      scope,
      redirectUri,
    );

    handleAuthRequestUrl(requestUrl);

  } catch (error: unknown) {

    throw new Error(`An error occurred while performing an auth request to ${issuer} : ${error}`);

  }

};

export interface tokenRequestReturnObject {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
}

/**
 * Perform a token request to the given issuer with the desired parameters and return the result
 *
 * @param issuer the issuer url
 * @param clientId the client id
 * @param authorizationCode the authorization code
 * @param redirectUri the redurect uri
 * @param codeVerifier the code verifier
 * @param publicKey the public key
 * @param privateKey the private key
 * @param clientSecret the client secret
 * @returns an object containing the access token, the id token and if present the refresh token
 */
export const tokenRequest = async (
  issuer: string,
  clientId: string,
  authorizationCode: string,
  redirectUri: string,
  codeVerifier: string,
  publicKey: JWK,
  privateKey: JWK,
  clientSecret?: string,
): Promise<tokenRequestReturnObject> => {

  if (!issuer) throw new Error('Parameter "issuer" should be set');
  if (!clientId) throw new Error('Parameter "clientId" should be set');
  if (!authorizationCode) throw new Error('Parameter "authorizationCode" should be set');
  if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');
  if (!codeVerifier) throw new Error('Parameter "codeVerifier" should be set');
  if (!publicKey) throw new Error('Parameter "publicKey" should be set');
  if (!privateKey) throw new Error('Parameter "privateKey" should be set');

  const tokenEndpoint = await getEndpoint(issuer, 'token_endpoint');
  if (!tokenEndpoint) throw new Error(`No token endpoint was found for issuer ${issuer}`);

  try {

    const method = 'POST';
    const dpopProof = await createDpopProof(method, tokenEndpoint, publicKey, privateKey);

    const data = new URLSearchParams();
    data.set('grant_type', 'authorization_code');
    data.set('code', authorizationCode);
    data.set('client_id', clientId);
    data.set('redirect_uri', redirectUri);
    data.set('code_verifier', codeVerifier);
    if (clientSecret) data.set('client_secret', clientSecret);

    const response = await validateAndFetch(tokenEndpoint, {
      method,
      headers: {
        'DPoP': dpopProof,
      },
      body: data,
    });

    const parsed = await response.json();

    if (parsed?.error) throw new Error(parsed.error);
    if (!parsed?.access_token) throw new Error('The tokenRequest response must contain an access_token field, and it did not.');
    if (!parsed?.id_token) throw new Error('The tokenRequest response must contain an id_token field, and it did not.');

    return {
      accessToken: parsed.access_token,
      idToken: parsed.id_token,
      refreshToken: parsed.refresh_token,
    };

  } catch (error: unknown) {

    throw new Error(`An error occurred while requesting tokens for issuer "${issuer}" : ${error}`);

  }

};

export interface refreshTokenRequestReturnObject {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
}

/**
 * Perform a token refresh request and return the result
 *
 * @param issuer the issuer url
 * @param clientId the client id
 * @param refreshToken the refresh token
 * @param publicKey the public key
 * @param privateKey the private key
 * @param clientSecret the client secret
 * @returns an object containing the access token, the refresh token and if present the id token
 */
export const refreshTokenRequest = async (
  issuer: string,
  clientId: string,
  refreshToken: string,
  publicKey: JWK,
  privateKey: JWK,
  clientSecret?: string,
): Promise<refreshTokenRequestReturnObject> => {

  if (!issuer) throw new Error('Parameter "issuer" should be set');
  if (!clientId) throw new Error('Parameter "clientId" should be set');
  if (!refreshToken) throw new Error('Parameter "refreshToken" should be set');
  if (!publicKey) throw new Error('Parameter "publicKey" should be set');
  if (!privateKey) throw new Error('Parameter "privateKey" should be set');

  const tokenEndpoint = await getEndpoint(issuer, 'token_endpoint');
  if (!tokenEndpoint) throw new Error(`No token endpoint was found for issuer ${issuer}`);

  try {

    const method = 'POST';
    const dpopProof = await createDpopProof(method, tokenEndpoint, publicKey, privateKey);

    const data = new URLSearchParams();
    data.set('grant_type', 'refresh_token');
    data.set('client_id', clientId);
    data.set('refresh_token', refreshToken);
    if (clientSecret) data.set('client_secret', clientSecret);

    const response = await validateAndFetch(tokenEndpoint, {
      method,
      headers: {
        'DPoP': dpopProof,
      },
      body: data,
    });

    const parsed = await response.json();

    if (parsed?.error) throw new Error(parsed.error);
    if (!parsed?.access_token) throw new Error('The tokenRequest response must contain an access_token field, and it did not.');
    if (!parsed?.refresh_token) throw new Error('The tokenRequest response must contain an refresh_token field, and it did not.');

    return {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token,
      idToken: parsed.id_token,
    };

  } catch (error: unknown) {

    throw new Error(`An error occurred while refreshing tokens for issuer "${issuer}" : ${error}`);

  }

};

/**
 * Access a resource at the given url using the given parameters for authentication
 *
 * @param resource the resource url
 * @param method the http method
 * @param accessToken the access token
 * @param publicKey the public key
 * @param privateKey the private key
 * @param body the body of the request
 * @param contentType the content-type header
 * @returns the response object of the request
 */
export const accessResource = async (
  resource: string,
  method: HttpMethod,
  accessToken: string,
  publicKey: JWK,
  privateKey: JWK,
  body?: string,
  contentType?: string,
): Promise<Response> => {

  if (!resource) throw new Error('Parameter "resource" should be set');
  if (!method) throw new Error('Parameter "method" should be set');
  if (!accessToken) throw new Error('Parameter "accessToken" should be set');
  if (!publicKey) throw new Error('Parameter "publicKey" should be set');
  if (!privateKey) throw new Error('Parameter "privateKey" should be set');

  try{

    const dpopProof = await createDpopProof(method, resource, publicKey, privateKey);

    return await validateAndFetch(resource, {
      method,
      headers: {
        'Authorization': `DPoP ${accessToken}`,
        'DPoP': dpopProof,
        ... (contentType && { 'Content-Type': contentType }),
      },
      ... (body && { body }),
    });

  } catch (error: unknown) {

    throw new Error(`An error occurred trying to access resource ${resource} : ${error}`);

  }

};
