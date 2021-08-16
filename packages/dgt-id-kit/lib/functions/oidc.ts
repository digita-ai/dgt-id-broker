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
  responseType: string,
  scope: string,
  redirectUri: string,
): Promise<string> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!pkceCodeChallenge) { throw new Error('Parameter "pkceCodeChallenge" should be set'); }

  if (!responseType) { throw new Error('Parameter "responseType" should be set'); }

  if (!scope) { throw new Error('Parameter "scope" should be set'); }

  if (!redirectUri) { throw new Error('Parameter "redirectUri" should be set'); }

  const authorizationEndpoint = await getEndpoint(issuer, 'authorization_endpoint');

  if (!authorizationEndpoint) { throw new Error(`No authorization endpoint was found for issuer ${issuer}`); }

  return `${authorizationEndpoint}?` +
    `client_id=${clientId}&` +
    `code_challenge=${pkceCodeChallenge}&` +
    `code_challenge_method=S256&` +
    `response_type=${responseType}&` +
    `scope=${scope}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;

};

export const authRequest = async (
  issuer: string,
  clientId: string,
  scope: string,
  responseType: string,
  redirectUri: string,
  offlineAccess: boolean,
  // not used yet
): Promise<void> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!responseType) { throw new Error('Parameter "responseType" should be set'); }

  if (!scope) { throw new Error('Parameter "scope" should be set'); }

  if (!redirectUri) { throw new Error('Parameter "redirectUri" should be set'); }

  if (offlineAccess === undefined) { throw new Error('Parameter "offlineAccess" should be set'); }

  const codeVerifier = await generateCodeVerifier(128);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const requestUrl = await constructAuthRequestUrl(
    issuer,
    clientId,
    codeChallenge,
    responseType,
    scope,
    redirectUri,
  );

  await validateAndFetch(requestUrl);

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

  const method = 'POST';
  const dpopProof = await createDpopProof(method, tokenEndpoint);
  const codeVerifier = await store.get('codeVerifier');

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

  if (parsed?.access_token) { await store.set('accessToken', parsed.access_token); }

  if (parsed?.id_token) { await store.set('idToken', parsed.id_token); }

  if (parsed?.refresh_token) { await store.set('refreshToken', parsed.refresh_token); }

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

  if (!scope.includes('openid')) { throw new Error('Parameter "scope" should contain the "openid"'); }

  if (!refreshToken) { throw new Error('Parameter "refreshToken" should be set'); }

  const tokenEndpoint = await getEndpoint(issuer, 'token_endpoint');

  if (!tokenEndpoint) { throw new Error(`No token endpoint was found for issuer ${issuer}`); }

  const method = 'POST';
  const dpopProof = await createDpopProof(method, tokenEndpoint);
  const codeVerifier = await store.get('codeVerifier');

  const data = new URLSearchParams();
  data.set('grant_type', 'refresh_token');
  data.set('client_id', clientId);
  data.set('code_verifier', codeVerifier);
  data.set('scope', scope);

  if (clientSecret) { data.set('client_secret', clientSecret); }

  const response = await validateAndFetch(tokenEndpoint, {
    method,
    headers: {
      'DPoP': dpopProof,
    },
    body: data,
  });

  const parsed = await response.json();

  if (parsed?.access_token) { await store.set('accessToken', parsed.access_token); }

  if (parsed?.id_token) { await store.set('idToken', parsed.id_token); }

};

export const accessResource = async (
  resource: string,
  method: HttpMethod,
  body?: string,
  contentType?: string,
): Promise<void> => {

  // change return type to Response, changed to void to run tests
  if (!resource) { throw new Error('Parameter "resource" should be set'); }

  if (!method) { throw new Error('Parameter "method" should be set'); }

  // Send a request with the DPoP bound access_token from the store to the
  // resource server. Check that the access_token has not expired and is still valid.
  // If it is not valid, a new one can be requested using the refresh_token and the
  // refreshTokenRequest function. Make sure to use the createDpopProof function as a
  // valid DPoP proof will be necessary for every request to a resource.
  // In this case the resource url will be the htu, and the method will be the htm.
  // Check that the body is present for any method that would require it (such as POST).
  // Content-type is not required. If it’s omitted, don’t add it to the request.
  // This function should return the fetched Response.

};
