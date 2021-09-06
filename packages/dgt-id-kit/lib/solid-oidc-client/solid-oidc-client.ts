import { HttpMethod } from '@digita-ai/handlersjs-http';
import { JWK } from 'jose/webcrypto/types';
import { generateKeys } from '../functions/dpop';
import { accessResource, authRequest, refreshTokenRequest, tokenRequest } from '../functions/oidc';
import { generateCodeVerifier } from '../functions/pkce';
import { getFirstIssuerFromWebId } from '../functions/web-id';
import { TypedKeyValueStore } from '../models/typed-key-value-store.model';

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

export class SolidOidcClient {

  constructor(private store: TypedKeyValueStore<storeInterface>) { }

  async initialize(clientId: string): Promise<void> {

    const keys = await generateKeys();
    if (!(await this.store.has('privateKey'))) await this.store.set('privateKey', keys.privateKey);
    if (!(await this.store.has('publicKey'))) await this.store.set('publicKey', keys.publicKey);

    if (!(await this.store.has('codeVerifier'))) await this.store.set('codeVerifier', generateCodeVerifier(120));
    await this.store.set('clientId', clientId);

  }

  async loginWithIssuer(
    issuer: string,
    scope: string,
    responseType: string,
  ): Promise<void> {

    if (!issuer) throw new Error('Parameter "issuer" should be set');
    if (!scope) throw new Error('Parameter "scope" should be set');
    if (!responseType) throw new Error('Parameter "responseType" should be set');

    const clientId = await this.store.get('clientId');
    if (!clientId) throw this.getInitializeError('clientId');

    await authRequest(issuer, clientId, scope, responseType);

  }

  async loginWithWebId(
    webId: string,
    scope: string,
    responseType: string,
  ): Promise<void> {

    if (!webId) throw new Error('Parameter "webId" should be set');
    if (!scope) throw new Error('Parameter "scope" should be set');
    if (!responseType) throw new Error('Parameter "responseType" should be set');

    const issuer = await getFirstIssuerFromWebId(webId);
    if (!issuer) throw new Error(`No issuer was found on the profile of ${webId}`);

    await this.loginWithIssuer(issuer.url.toString(), scope, responseType);

  }

  async logout(): Promise<void> {

    await this.store.delete('accessToken');
    await this.store.delete('refreshToken');
    await this.store.delete('idToken');

  }

  async handleIncomingRedirect(
    issuer: string,
    redirectUri: string,
    clientSecret?: string,
  ): Promise<void> {

    const clientId = await this.store.get('clientId');
    if (!clientId) throw this.getInitializeError('clientId');

    if (!issuer) throw new Error('Parameter "issuer" should be set');
    await this.store.set('issuer', issuer);

    if (!redirectUri) throw new Error('Parameter "redirectUri" should be set');

    if (clientSecret) await this.store.set('clientSecret', clientSecret);

    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) throw new Error(`No authorization code was found in window.location.search : ${window.location.search}`);

    const privateKey = await this.store.get('privateKey');
    if (!privateKey) throw this.getInitializeError('privateKey');
    const publicKey = await this.store.get('publicKey');
    if (!publicKey) throw this.getInitializeError('publicKey');
    const codeVerifier = await this.store.get('codeVerifier');
    if (!codeVerifier) throw this.getInitializeError('codeVerifier');

    try {

      const tokens = await tokenRequest(
        issuer, clientId, code, redirectUri, codeVerifier, publicKey, privateKey, clientSecret,
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

    if (!resource) throw new Error('Parameter "resource" should be set');
    if (!method) throw new Error('Parameter "method" should be set');

    const privateKey = await this.store.get('privateKey');
    if (!privateKey) throw this.getInitializeError('privateKey');
    const publicKey = await this.store.get('publicKey');
    if (!publicKey) throw this.getInitializeError('publicKey');
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
        if (!clientId) throw this.getInitializeError('clientId');
        const clientSecret = await this.store.get('clientSecret');

        const result = await refreshTokenRequest(issuer, clientId, refreshToken, publicKey, privateKey, clientSecret);

        accessToken = result.accessToken;

        await this.store.set('accessToken', result.accessToken);
        await this.store.set('refreshToken', result.refreshToken);
        if (result.idToken) await this.store.set('idToken', result.idToken);

      }

      return accessResource(resource, method, accessToken, publicKey, privateKey, body, contentType);

    } catch (error: unknown) {

      throw new Error(`An error occurred trying to access resource ${resource} : ${error}`);

    }

  }

  private getInitializeError(field: string): Error {

    return new Error(`No ${field} was found, did you call initialize()?`);

  }

}
