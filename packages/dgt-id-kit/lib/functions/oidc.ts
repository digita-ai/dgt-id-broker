import { HttpMethod } from '@digita-ai/handlersjs-http';

export const constructAuthRequestUrl = async (
  authorizationEndpoint: string,
  cliendDd: string,
  pkceCodeChallenge: string,
  responseType: string,
  scope: string,
  redirectUri: string,
): Promise<URL> => {

};

export const authRequest = async (
  issuer: string,
  clientId: string,
  scope: string,
  responseType: string,
  offline_access: boolean,
): Promise<void> => {

};

export const tokenRequest = async (
  issuer: string,
  clientId: string,
  authorizationCode: string,
  redirectUri: string,
  clientSecret?: string,
): Promise<void> => {

};

export const refreshTokenRequest = async (
  issuer: string,
  clientId: string,
  refreshToken: string,
  scope: string,
  clientSecret?: string,
): Promise<void> => {

};

export const accessResource = async (
  resource: string,
  method: HttpMethod,
  body?: string,
  contentType?: string,
): Promise<Response> => {

};
