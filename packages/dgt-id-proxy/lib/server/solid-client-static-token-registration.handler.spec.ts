import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import fetchMock from 'jest-fetch-mock';
import { recalculateContentLength } from '../util/recalculate-content-length';
import { SolidClientStaticTokenRegistrationHandler } from './solid-client-static-token-registration.handler';

describe('SolidClientStaticTokenRegistrationHandler', () => {

  beforeAll(() => fetchMock.enableMocks());

  const httpHandler = {
    canHandle: jest.fn(),
    handle: jest.fn().mockReturnValue(of()),
    safeHandle: jest.fn(),
  } as HttpHandler;

  const referer = 'http://client.example.com';
  const url =  new URL(`${referer}/token`);
  const code_verifier = 'hmWgQqnBMBeK23cGJvJko9rdIZrNfuvCsZ43uNzdMQhs3HVU6Q4yWvVji3pftn9rz3xDwcPTYgtwi2SXBrvfsrlP4xcQftpd1Yj23ocpTRMAYUU6ptqmsTCRV6Q8DtkT';
  const code = 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET';
  const redirect_uri = 'http://client.example.com/requests.html';
  const client_id = 'http://solidpod./jaspervandenberghen/profile/card#me';
  const client_id_constructor = 'static_client';
  const client_secret = 'static_secret';
  const redirect_uri_constructor = 'http://digita.ai/redirect';
  const noClientIDRequestBody = `grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}&code_verifier=${code_verifier}`;
  const noGrantTypeRequestBody = `code=${code}&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const noRedirectUriRequestBody = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(client_id)}&code_verifier=${code_verifier}`;
  const headers = { 'content-length': '302', 'content-type': 'application/json;charset=utf-8' };
  const requestBody = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const requestBodyWithOtherGrantType = `grant_type=implicit&code=${code}&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const requestBodyWithStaticClient = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(client_id_constructor)}&redirect_uri=${encodeURIComponent(redirect_uri_constructor)}&code_verifier=${code_verifier}&client_secret=${client_secret}`;

  const context = { request: { headers, body: requestBody, method: 'POST', url } } as HttpHandlerContext;

  const podText = `
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.
    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
    <>
      a foaf:PersonalProfileDocument;
      foaf:maker <http://solidpod.com/jaspervandenberghen/profile/card#me>;
      foaf:primaryTopic <http://solidpod.com/jaspervandenberghen/profile/card#me>.
    <http://solidpod.com/jaspervandenberghen/profile/card#me>
      a foaf:Person;
      foaf:name "Jasper Vandenberghen";
      solid:oidcIssuer <http://server.example.com/> ;
      solid:oidcIssuerRegistrationToken "" .
  `;

  const oidcRegistration = `<#id> solid:oidcRegistration """{"client_id" : "${client_id}","redirect_uris" : ["${redirect_uri}"],"client_name" : "My Panva Application", "client_uri" : "https://app.example/","logo_uri" : "https://app.example/logo.png","tos_uri" : "https://app.example/tos.html","scope" : "openid offline_access","grant_types" : ["refresh_token","authorization_code"],"response_types" : ["code"],"default_max_age" : 60000,"require_auth_time" : true}""" .`;
  const correctPodText = podText + ' ' + oidcRegistration;

  const solidClientStaticTokenRegistrationHandler = new SolidClientStaticTokenRegistrationHandler(
    httpHandler,
    client_id_constructor,
    client_secret,
    redirect_uri_constructor,
  );

  it('should be correctly instantiated', () => {

    expect(solidClientStaticTokenRegistrationHandler).toBeTruthy();

  });

  it('should error when no handler, clientId, clientSecret or redirectUri are provided', () => {

    expect(() => new SolidClientStaticTokenRegistrationHandler(undefined, client_id_constructor, client_secret, redirect_uri_constructor)).toThrow('No handler was provided');
    expect(() => new SolidClientStaticTokenRegistrationHandler(null, client_id_constructor, client_secret, redirect_uri_constructor)).toThrow('No handler was provided');
    expect(() => new SolidClientStaticTokenRegistrationHandler(httpHandler, undefined, client_secret, redirect_uri_constructor)).toThrow('No clientID was provided');
    expect(() => new SolidClientStaticTokenRegistrationHandler(httpHandler, null, client_secret, redirect_uri_constructor)).toThrow('No clientID was provided');
    expect(() => new SolidClientStaticTokenRegistrationHandler(httpHandler, client_id_constructor, undefined, redirect_uri_constructor)).toThrow('No clientSecret was provided');
    expect(() => new SolidClientStaticTokenRegistrationHandler(httpHandler, client_id_constructor, null, redirect_uri_constructor)).toThrow('No clientSecret was provided');
    expect(() => new SolidClientStaticTokenRegistrationHandler(httpHandler, client_id_constructor, client_secret, undefined)).toThrow('No redirectUri was provided');
    expect(() => new SolidClientStaticTokenRegistrationHandler(httpHandler, client_id_constructor, client_secret, null)).toThrow('No redirectUri was provided');

  });

  it('should error when redirectUri is not a valid URI', () => {

    expect(() => new SolidClientStaticTokenRegistrationHandler(httpHandler, client_id_constructor, client_secret, 'notAValidURI')).toThrow('redirectUri must be a valid URI');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => solidClientStaticTokenRegistrationHandler.handle(undefined).toPromise()).rejects.toThrow('A context must be provided');
      await expect(() => solidClientStaticTokenRegistrationHandler.handle(null).toPromise()).rejects.toThrow('A context must be provided');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => solidClientStaticTokenRegistrationHandler.handle({ ...context, request: null }).toPromise()).rejects.toThrow('No request was included in the context');
      await expect(() => solidClientStaticTokenRegistrationHandler.handle({ ...context, request: undefined }).toPromise()).rejects.toThrow('No request was included in the context');

    });

    it('should error when no request body is provided', async () => {

      await expect(() => solidClientStaticTokenRegistrationHandler.handle({ ...context, request: { ...context.request, body: null } }).toPromise()).rejects.toThrow('No body was included in the request');
      await expect(() => solidClientStaticTokenRegistrationHandler.handle({ ...context, request: { ...context.request, body: undefined } }).toPromise()).rejects.toThrow('No body was included in the request');

    });

    it('should error when no client_id was provided', async () => {

      const noClientIdContext = { ... context, request: { ...context.request, body:  noClientIDRequestBody } };
      await expect(() => solidClientStaticTokenRegistrationHandler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');

    });

    it('should error when no grant_type was provided', async () => {

      const noGrantTypeContext = { ... context, request: { ...context.request, body:  noGrantTypeRequestBody } };
      await expect(() => solidClientStaticTokenRegistrationHandler.handle(noGrantTypeContext).toPromise()).rejects.toThrow('No grant_type was provided');

    });

    it('should error when no redirect_uri was provided', async () => {

      const noRedirectUriContext = { ... context, request: { ...context.request, body:  noRedirectUriRequestBody } };
      await expect(() => solidClientStaticTokenRegistrationHandler.handle(noRedirectUriContext).toPromise()).rejects.toThrow('No redirect_uri was provided');

    });

    it('should error when return type is not turtle', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/html' }, status: 200 });

      await expect(solidClientStaticTokenRegistrationHandler.handle(context).toPromise()).rejects.toThrow(`Incorrect content-type: expected text/turtle but got text/html`);

    });

    it('should error when the webId is not valid', async () => {

      fetchMock.once(podText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await expect(solidClientStaticTokenRegistrationHandler.handle(context).toPromise()).rejects.toThrow(`Not a valid webID: No oidcRegistration field found`);

    });

    it('should error if the grant type is not present in the pod', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await expect(solidClientStaticTokenRegistrationHandler.handle({ ...context, request: { ...context.request, body: requestBodyWithOtherGrantType } }).toPromise()).rejects.toThrow('The grant type in the request is not included in the WebId');

    });

    it('should handle the context if all data is correct', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await solidClientStaticTokenRegistrationHandler.handle(context).toPromise();

      expect(httpHandler.handle).toHaveBeenCalledTimes(1);

      expect(httpHandler.handle)
        .toHaveBeenCalledWith({ ...context, request: { ...context.request, body: requestBodyWithStaticClient } });

    });

    it('should replace the client_id and redirect_uri with the registered one & change the content length, add client_secret', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 });
      const newContext = { request: { headers, body: requestBodyWithStaticClient, method: 'POST', url } } as HttpHandlerContext;
      const length = recalculateContentLength(newContext.request);
      await solidClientStaticTokenRegistrationHandler.handle(context).toPromise();

      expect(httpHandler.handle).toHaveBeenCalledWith({ ...newContext, request: { ...newContext.request, headers: { 'content-length': length, 'content-type': 'application/json;charset=utf-8' } } });

    });

  });

  describe('canHandle', () => {

    it('should return true if correct context was provided', async () => {

      await expect(solidClientStaticTokenRegistrationHandler.canHandle(context).toPromise()).resolves.toEqual(true);

    });

    it('should return false if no context was provided', async () => {

      await expect(solidClientStaticTokenRegistrationHandler.canHandle(null).toPromise()).resolves.toEqual(false);

      await expect(solidClientStaticTokenRegistrationHandler.canHandle(undefined).toPromise())
        .resolves.toEqual(false);

    });

    it('should return false if no request was provided', async () => {

      await expect(solidClientStaticTokenRegistrationHandler.canHandle({ ...context, request: null })
        .toPromise()).resolves.toEqual(false);

      await expect(solidClientStaticTokenRegistrationHandler.canHandle({ ...context, request: undefined })
        .toPromise()).resolves.toEqual(false);

    });

    it('should return false if no request body was provided', async () => {

      await expect(solidClientStaticTokenRegistrationHandler
        .canHandle({ ...context, request: { ...context.request, body: null } })
        .toPromise()).resolves.toEqual(false);

      await expect(solidClientStaticTokenRegistrationHandler
        .canHandle({ ...context, request: { ...context.request, body: undefined } })
        .toPromise()).resolves.toEqual(false);

    });

  });

});
