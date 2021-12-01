import { assert, isString } from '@digita-ai/dgt-utils-core';
import { isJwk } from '../util/asserts';
import { handleIncomingRedirect, loginWithIssuer, loginWithWebId } from '../functions/client';
import { generateKeys } from '../functions/dpop';
import { accessResource, refreshTokenRequest } from '../functions/oidc';
import { generateCodeChallenge, generateCodeVerifier } from '../functions/pkce';
import { HttpMethod } from '../models/http-method.model';

/* istanbul ignore next */
export const defaultGetAuthorizationCode =
async (): Promise<string> => new URLSearchParams(window.location.search).get('code') ?? '';

/* istanbul ignore next */
export const defaultHandleAuthRequestUrl =
async (requestUrl: string): Promise<void> => { window.location.href = requestUrl; };

interface SecureStore {
  get: (key: string) => Promise<unknown|null>;
  set: (key: string, value: unknown) => Promise<this>;
  delete: (key: string) => Promise<boolean>;
}

export class SolidOidcClient {

  constructor(
    private store: SecureStore,
    private initialized = true,
    private clientId?: string,
  ) {

    if (!clientId && !initialized) throw new Error('Parameter initialized can not be false when no clientId was provided');

  }

  private async initialize(): Promise<void> {

    const keys = await generateKeys();
    await this.store.set('privateKey', keys.privateKey);
    await this.store.set('publicKey', keys.publicKey);

    await this.store.set('codeVerifier', generateCodeVerifier(128));

    if (this.clientId) await this.store.set('clientId', this.clientId);

    this.initialized = true;

  }

  async loginWithIssuer(
    issuer: string,
    scope: string,
    redirectUri: string,
    state?: string,
    handleAuthRequestUrl: (requestUrl: string) => Promise<void> = defaultHandleAuthRequestUrl,
  ): Promise<void> {

    if (!this.initialized) await this.initialize();

    if (!issuer) throw new Error('Parameter "issuer" should be set');
    if (!scope) throw new Error('Parameter "scope" should be set');
    if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');

    const clientId = await this.store.get('clientId');

    assert(isString(clientId), 'No client_id available in the store');

    const codeVerifier = await this.store.get('codeVerifier');

    assert(isString(codeVerifier), 'No code verifier available in the store');

    const codeChallenge = generateCodeChallenge(codeVerifier);

    await loginWithIssuer(issuer, clientId, scope, redirectUri, codeChallenge, state, handleAuthRequestUrl);

  }

  async loginWithWebId(
    webId: string,
    scope: string,
    redirectUri: string,
    state?: string,
    handleAuthRequestUrl: (requestUrl: string) => Promise<void> = defaultHandleAuthRequestUrl,
  ): Promise<void> {

    if (!this.initialized) await this.initialize();

    if (!webId) throw new Error('Parameter "webId" should be set');
    if (!scope) throw new Error('Parameter "scope" should be set');
    if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');

    const clientId = await this.store.get('clientId');

    assert(isString(clientId), 'No client_id available in the store');

    const codeVerifier = await this.store.get('codeVerifier');

    assert(isString(codeVerifier), 'No code verifier available in the store');

    const codeChallenge = generateCodeChallenge(codeVerifier);

    await loginWithWebId(webId, clientId, scope, redirectUri, codeChallenge, state, handleAuthRequestUrl);

  }

  async logout(): Promise<void> {

    await this.store.delete('accessToken');
    await this.store.delete('refreshToken');
    await this.store.delete('idToken');

  }

  async handleIncomingRedirect(
    issuer: string,
    redirectUri: string,
    getAuthorizationCode: () => Promise<string|null> = defaultGetAuthorizationCode,
    clientSecret?: string,
  ): Promise<void> {

    if (!this.initialized) await this.initialize();

    const clientId = await this.store.get('clientId');

    assert(isString(clientId), 'No client_id available in the store');

    if (!issuer) throw new Error('Parameter "issuer" should be set');
    await this.store.set('issuer', issuer);

    if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');

    if (clientSecret) await this.store.set('clientSecret', clientSecret);

    const privateKey = await this.store.get('privateKey');
    const publicKey = await this.store.get('publicKey');
    const codeVerifier = await this.store.get('codeVerifier');

    assert(isJwk(privateKey), 'No private key available in the store');
    assert(isJwk(publicKey), 'No public key available in the store');
    assert(isString(codeVerifier), 'No code verifier available in the store');

    try {

      const tokens = await handleIncomingRedirect(
        issuer, clientId, redirectUri, codeVerifier, publicKey, privateKey, getAuthorizationCode, clientSecret,
      );

      await this.store.set('accessToken', tokens.accessToken);
      await this.store.set('idToken', tokens.idToken);
      if (tokens.refreshToken) await this.store.set('refreshToken', tokens.refreshToken);

    } catch (error: unknown) {

      throw new Error(`An error occurred handling the incoming redirect : ${error}`);

    }

  }

  /**
   * Access a resource at the given url using the given parameters for authentication
   *
   * @param resource the resource url
   * @param method the http method
   * @param body the body of the request
   * @param contentType the content-type header
   * @returns the response object of the request
   */
  async accessResource(
    resource: string,
    method: HttpMethod,
    body?: string,
    contentType?: string,
  ): Promise<Response> {

    if (!this.initialized) await this.initialize();

    if (!resource) throw new Error('Parameter "resource" should be set');
    if (!method) throw new Error('Parameter "method" should be set');

    const privateKey = await this.store.get('privateKey');
    const publicKey = await this.store.get('publicKey');
    const accessToken = await this.store.get('accessToken');

    assert(isJwk(privateKey), 'No private key available in the store');
    assert(isJwk(publicKey), 'No public key available in the store');
    assert(isString(accessToken), 'No accessToken available, did you login correctly?');

    let refreshedAccessToken: string = accessToken;

    try {

      const tokenBody = JSON.parse(atob(accessToken.split('.')[1]));
      const exp = tokenBody.exp;

      if (+new Date() > exp * 1000) {

        // Refreshing tokens

        const refreshToken = await this.store.get('refreshToken');
        const issuer = await this.store.get('issuer');
        const clientId = await this.store.get('clientId');
        const clientSecret = await this.store.get('clientSecret');

        assert(isString(refreshToken), 'No refreshToken available, did you login with "offline_access" in the scope?');
        assert(isString(issuer), 'No issuer available, did you login correctly?');
        assert(isString(clientId), 'No client_id available in the store');
        assert(isString(clientSecret), 'No client_secret available in the store');

        const result = await refreshTokenRequest(issuer, clientId, refreshToken, publicKey, privateKey, clientSecret);

        refreshedAccessToken = result.accessToken;

        await this.store.set('accessToken', result.accessToken);
        await this.store.set('refreshToken', result.refreshToken);
        await this.store.set('idToken', result.idToken);

      }

      return await accessResource(resource, method, refreshedAccessToken, publicKey, privateKey, body, contentType);

    } catch (error: unknown) {

      throw new Error(`An error occurred trying to access resource ${resource} : ${error}`);

    }

  }

}
