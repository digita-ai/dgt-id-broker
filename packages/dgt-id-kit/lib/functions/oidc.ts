import { HttpMethod } from '@digita-ai/handlersjs-http';
import { createDpopProof } from './dpop';
import { getEndpoint } from './issuer';
import { generateCodeChallenge, generateCodeVerifier } from './pkce';
import { store } from './storage';
import { validateAndFetch } from './validate-and-fetch';

export const constructAuthRequestUrl = async (
  issuer: string,
  clientId: string,
  pkceCodeChallenge: string,
  scope: string,
  redirectUri: string,
): Promise<string> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!pkceCodeChallenge) { throw new Error('Parameter "pkceCodeChallenge" should be set'); }

  if (!scope) { throw new Error('Parameter "scope" should be set'); }

  if (!redirectUri) { throw new Error('Parameter "redirectUri" should be set'); }

  const authorizationEndpoint = await getEndpoint(issuer, 'authorization_endpoint');

  if (!authorizationEndpoint) { throw new Error(`No authorization endpoint was found for issuer ${issuer}`); }

  return `${authorizationEndpoint}?` +
    `client_id=${clientId}&` +
    `code_challenge=${pkceCodeChallenge}&` +
    `code_challenge_method=S256&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;

};

export const authRequest = async (
  issuer: string,
  clientId: string,
  scope: string,
  redirectUri: string,
): Promise<void> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!scope) { throw new Error('Parameter "scope" should be set'); }

  if (!redirectUri) { throw new Error('Parameter "redirectUri" should be set'); }

  try {

    const codeVerifier = await generateCodeVerifier(128);
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const requestUrl = await constructAuthRequestUrl(
      issuer,
      clientId,
      codeChallenge,
      scope,
      redirectUri,
    );

    await validateAndFetch(requestUrl);

  } catch (error: unknown) {

    throw new Error(`An error occurred while performing an auth request to ${issuer} : ${error}`);

  }

};

export const tokenRequest = async (
  issuer: string,
  clientId: string,
  authorizationCode: string,
  redirectUri: string,
  clientSecret?: string,
): Promise<void> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!authorizationCode) { throw new Error('Parameter "authorizationCode" should be set'); }

  if (!redirectUri) { throw new Error('Parameter "redirectUri" should be set'); }

  const tokenEndpoint = await getEndpoint(issuer, 'token_endpoint');

  if (!tokenEndpoint) { throw new Error(`No token endpoint was found for issuer ${issuer}`); }

  const codeVerifier = await store.get('codeVerifier');

  if (!codeVerifier) { throw new Error('No code verifier was found in the store'); }

  try {

    const method = 'POST';
    const dpopProof = await createDpopProof(method, tokenEndpoint);

    const data = new URLSearchParams();
    data.set('grant_type', 'authorization_code');
    data.set('code', authorizationCode);
    data.set('client_id', clientId);
    data.set('redirect_uri', redirectUri);
    data.set('code_verifier', codeVerifier);

    if (clientSecret) { data.set('client_secret', clientSecret); }

    const response = await validateAndFetch(tokenEndpoint, {
      method,
      headers: {
        'DPoP': dpopProof,
      },
      body: data,
    });

    const parsed = await response.json();

    if (parsed?.error) { throw new Error(parsed.error); }

    if (!parsed?.access_token) { throw new Error('The tokenRequest response must contain an access_token field, and it did not.'); }

    if (parsed.access_token) { await store.set('accessToken', parsed.access_token); }

    if (!parsed?.id_token) { throw new Error('The tokenRequest response must contain an id_token field, and it did not.'); }

    if (parsed.id_token) { await store.set('idToken', parsed.id_token); }

    if (parsed?.refresh_token) { await store.set('refreshToken', parsed.refresh_token); }

  } catch (error: unknown) {

    throw new Error(`An error occurred while requesting tokens for issuer "${issuer}" : ${error}`);

  }

};

export const refreshTokenRequest = async (
  issuer: string,
  clientId: string,
  refreshToken: string,
  scope: string,
  clientSecret?: string,
): Promise<void> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!scope) { throw new Error('Parameter "scope" should be set'); }

  if (!scope.includes('openid')) { throw new Error('Parameter "scope" should contain "openid"'); }

  if (!refreshToken) { throw new Error('Parameter "refreshToken" should be set'); }

  const tokenEndpoint = await getEndpoint(issuer, 'token_endpoint');

  if (!tokenEndpoint) { throw new Error(`No token endpoint was found for issuer ${issuer}`); }

  try {

    const method = 'POST';
    const dpopProof = await createDpopProof(method, tokenEndpoint);

    const data = new URLSearchParams();
    data.set('grant_type', 'refresh_token');
    data.set('client_id', clientId);
    data.set('scope', scope);
    data.set('refresh_token', refreshToken);

    if (clientSecret) { data.set('client_secret', clientSecret); }

    const response = await validateAndFetch(tokenEndpoint, {
      method,
      headers: {
        'DPoP': dpopProof,
      },
      body: data,
    });

    const parsed = await response.json();

    if (parsed?.error) { throw new Error(parsed.error); }

    if (!parsed?.access_token) { throw new Error('The tokenRequest response must contain an access_token field, and it did not.'); }

    if (parsed.access_token) { await store.set('accessToken', parsed.access_token); }

    if (!parsed?.id_token) { throw new Error('The tokenRequest response must contain an id_token field, and it did not.'); }

    if (parsed.id_token) { await store.set('idToken', parsed.id_token); }

  } catch (error: unknown) {

    throw new Error(`An error occurred while refreshing tokens for issuer "${issuer}" : ${error}`);

  }

};

export const accessResource = async (
  resource: string,
  method: HttpMethod,
  body?: string,
  contentType?: string,
): Promise<Response> => {

  if (!resource) { throw new Error('Parameter "resource" should be set'); }

  if (!method) { throw new Error('Parameter "method" should be set'); }

  const accessToken = await store.get('accessToken');

  if (!accessToken) { throw new Error('No access token was found in the store'); }

  try{

    const tokenBody = JSON.parse(atob(accessToken.split('.')[1]));
    const exp = tokenBody?.exp;

    if (+new Date() > exp) {

      // const refreshToken = await store.get('refreshToken');

      // await refreshTokenRequest(issuer, clientId, refreshToken, 'openid', clientSecret);

      // accessToken = await store.get('accessToken');

    }

    const dpopProof = await createDpopProof(method, resource);

    return await validateAndFetch(resource, {
      method,
      headers: {
        'Authorization': `DPoP ${accessToken}`,
        'DPoP': dpopProof,
        ... (contentType && { 'Content-Type': contentType }),
      },
      ... (body && { body }),
    });

    // Check that the body is present for any method that would require it (such as POST).
    // -- Not implementing this check for now as the HTTP spec does not require a body for ANY method

  } catch (error: unknown) {

    throw new Error(`An error occurred trying to access resource ${resource} : ${error}`);

  }

};
