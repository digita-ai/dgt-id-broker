import { HttpMethod } from '@digita-ai/handlersjs-http';
import { getEndpoint } from './issuer';

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
  offlineAccess: boolean,
): Promise<void> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!responseType) { throw new Error('Parameter "responseType" should be set'); }

  if (!scope) { throw new Error('Parameter "scope" should be set'); }

  if (offlineAccess === undefined) { throw new Error('Parameter "offlineAccess" should be set'); }

  // NEED PKCE

  // Send a solid compliant request to the authorization_endpoint of the issuer.
  // Use the getEndpoint function to get the authorization_endpoint,
  // and use the PKCE functions to generate a code_challenge. Create the URL using the
  // constructAuthRequestUrl function, and make a request. This function returns
  // void because the request should result in a redirect.

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

  // NEED PKCE i guess ?

  // Send a solid compliant request to the token_endpoint of the issuer, save the
  // access_token, id_token, and refresh_token - if one was included in the response -
  // in the global store.

  // Use the getEndpoint function to get the token_endpoint,
  // and use the createDpopProof function as well.

  // Use the Token Request documentation from the Classic OIDC spec,
  // the PKCE spec, and the DPoP spec.

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

  if (!refreshToken) { throw new Error('Parameter "refreshToken" should be set'); }

  // NEED PKCE i guess ?

  // Send a request using a refresh_token. Store the access_token and id_token in
  // the global store.

  // Make sure the request is still valid for both the PKCE spec, and the DPoP spec.

};

export const accessResource = async (
  resource: string,
  method: HttpMethod,
  body?: string,
  contentType?: string,
): Promise<Response> => {

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
