import { JWK } from 'jose/types';
import { handleIncomingRedirect, loginWithIssuer, loginWithWebId } from '../functions/client';
import { generateKeys } from '../functions/dpop';
import { accessResource, refreshTokenRequest } from '../functions/oidc';
import { generateCodeChallenge, generateCodeVerifier } from '../functions/pkce';
import { TypedKeyValueStore } from '../models/typed-key-value-store.model';
import { HttpMethod } from '../models/http-method.model';
export interface storeInterface {
  publicKey: JWK;
  privateKey: JWK;
  codeVerifier: string;

  accessToken: string;
  refreshToken: string;
  idToken: string;

  issuer: string;
  clientId: string;
  clientSecret: string;
}
/* istanbul ignore next */
export const defaultGetAuthorizationCode = async (): Promise<string> => new URLSearchParams(window.location.search).get('code') ?? '';

/* istanbul ignore next */
export const defaultHandleAuthRequestUrl = async (requestUrl: string): Promise<void> => {

  window.location.href = requestUrl;

};

export class SolidOidcClient {

  /**
   * Creates a { SolidOidcClient }.
   *
   * @param { TypedKeyValueStore } store - A { TypedKeyValueStore } to store the keys and tokens.
   * @param { boolean } initialized - A boolean to indicate if the client is initialized.
   * @param { string } clientId? - A string representing the client id.
   */
  constructor(
    private store: TypedKeyValueStore<storeInterface>,
    private initialized: boolean = true,
    private clientId?: string,
  ) {

    if (!clientId && !initialized) throw new Error('Parameter initialized can not be false when no clientId was provided');

  }

  /**
   * Initializes the client.
   * Generates the keys and stores them in the store.
   * Generates a code verifier and stores it in the store
   * Sets the client id if present in the store.
   */
  private async initialize(): Promise<void> {

    const keys = await generateKeys();
    await this.store.set('privateKey', keys.privateKey);
    await this.store.set('publicKey', keys.publicKey);

    await this.store.set('codeVerifier', generateCodeVerifier(128));

    if (this.clientId) await this.store.set('clientId', this.clientId);

    this.initialized = true;

  }

  /**
   * Logs the client in using an issuer.
   * Checks if all necessary parameters are present and retrieves the client id and code verifier from the store.
   * Uses the code verifier to generate the code challenge and logs in using an issuer with the code challenge and the given parameters.
   *
   * @param { string } issuer - The clients Solid OIDC issuer.
   * @param { string } scope - The scope of the request.
   * @param { string } redirectUri - The uri to redirect the response to.
   * @param { string } state? - The state of the request.
   * @param { Promise<void> } handleAuthRequestUrl - The authentication request url.
   */
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
    if (!clientId) throw new Error('No client_id available in the store');

    const codeVerifier = await this.store.get('codeVerifier');
    if (!codeVerifier) throw new Error('No code verifier available in the store');

    const codeChallenge = generateCodeChallenge(codeVerifier);

    await loginWithIssuer(issuer, clientId, scope, redirectUri, codeChallenge, state, handleAuthRequestUrl);

  }
  /**
   * Logs the client in using a web id.
   * Checks if all necessary parameters are present and retrieves the client id and code verifier from the store.
   * Uses the code verifier to generate the code challenge and logs in using a web id with the code challenge and the given parameters.
   *
   * @param { string } webId - The web id of the client.
   * @param { string } scope - The scope of the request.
   * @param { string } redirectUri - The uri to redirect the response to.
   * @param { string } state? - The state of the request.
   * @param { Promise<void> } handleAuthRequestUrl - The authentication request url.
   */
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
    if (!clientId) throw new Error('No client_id available in the store');

    const codeVerifier = await this.store.get('codeVerifier');
    if (!codeVerifier) throw new Error('No code verifier available in the store');

    const codeChallenge = generateCodeChallenge(codeVerifier);

    await loginWithWebId(webId, clientId, scope, redirectUri, codeChallenge, state, handleAuthRequestUrl);

  }

  /**
   * Logs the client out.
   * Deletes all tokens from the store.
   */
  async logout(): Promise<void> {

    await this.store.delete('accessToken');
    await this.store.delete('refreshToken');
    await this.store.delete('idToken');

  }

  /**
   * Handles the incoming redirect.
   * Gets the client id, private key, public key and code verifier from the store.
   * Sets the client secret and the access-, id- and refresh token.
   *
   * @param { string } issuer - The clients Solid OIDC issuer.
   * @param { string } redirectUri - The uri to redirect the response to.
   * @param { Promise<string|null> } getAuthorizationCode - The authorization code.
   * @param { string } clientSecret? - The clients secret.
   */
  async handleIncomingRedirect(
    issuer: string,
    redirectUri: string,
    getAuthorizationCode: () => Promise<string|null> = defaultGetAuthorizationCode,
    clientSecret?: string,
  ): Promise<void> {

    if (!this.initialized) await this.initialize();

    const clientId = await this.store.get('clientId');
    if (!clientId) throw new Error('No client_id available in the store');

    if (!issuer) throw new Error('Parameter "issuer" should be set');
    await this.store.set('issuer', issuer);

    if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');

    if (clientSecret) await this.store.set('clientSecret', clientSecret);

    const privateKey = await this.store.get('privateKey');
    if (!privateKey) throw new Error('No private key available in the store');
    const publicKey = await this.store.get('publicKey');
    if (!publicKey) throw new Error('No public key available in the store');
    const codeVerifier = await this.store.get('codeVerifier');
    if (!codeVerifier) throw new Error('No code verifier available in the store');

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
   * @param { string } resource - The resource url.
   * @param { HttpMethod } method - The http method.
   * @param { string } body? - The body of the request.
   * @param { string } contentType? - The content-type header.
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
    if (!privateKey) throw new Error('No private key available in the store');
    const publicKey = await this.store.get('publicKey');
    if (!publicKey) throw new Error('No public key available in the store');
    let accessToken = await this.store.get('accessToken');
    if (!accessToken) throw new Error('No accessToken available, did you login correctly?');

    try{

      const tokenBody = JSON.parse(atob(accessToken.split('.')[1]));
      const exp = tokenBody.exp;

      if (+new Date() > exp * 1000) {

        // Refreshing tokens

        const refreshToken = await this.store.get('refreshToken');
        if (!refreshToken) throw new Error('No refreshToken available, did you login with "offline_access" in the scope?');
        const issuer = await this.store.get('issuer');
        if (!issuer) throw new Error('No issuer available, did you login correctly?');
        const clientId = await this.store.get('clientId');
        if (!clientId) throw new Error('No client_id available in the store');
        const clientSecret = await this.store.get('clientSecret');

        const result = await refreshTokenRequest(issuer, clientId, refreshToken, publicKey, privateKey, clientSecret);

        accessToken = result.accessToken;

        await this.store.set('accessToken', result.accessToken);
        await this.store.set('refreshToken', result.refreshToken);
        await this.store.set('idToken', result.idToken);

      }

      return await accessResource(resource, method, accessToken, publicKey, privateKey, body, contentType);

    } catch (error: unknown) {

      throw new Error(`An error occurred trying to access resource ${resource} : ${error}`);

    }

  }

}
