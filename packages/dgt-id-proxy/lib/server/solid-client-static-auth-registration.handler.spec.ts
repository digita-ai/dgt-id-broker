import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import fetchMock from 'jest-fetch-mock';
import { SolidClientStaticAuthRegistrationHandler } from './solid-client-static-auth-registration.handler';

describe('SolidClientStaticAuthRegistrationHandler', () => {

  let httpHandler: HttpHandler;

  const code_challenge_value = 'F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ';
  const code_challenge_method_value = 'S256';
  const referer = 'client.example.com';
  const client_id = 'http://solidpod.com/jaspervandenberghen/profile/card#me';
  const client_id_constructor = 'static_client';
  const client_secret = 'static_secret';
  const redirect_uri_constructor = 'http://digita.ai/redirect';
  const different_client_id = 'http://solidpod.com/vandenberghenjasper/profile/card#me';
  const redirect_uri = `http://${referer}/requests.html`;
  const endpoint = 'auth';
  const host = 'server.example.com';
  const differentClientIdURL= new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(different_client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
  const headers = { 'content-length': '302', 'content-type': 'application/json;charset=utf-8' };

  const solidClientStaticAuthRegistrationHandler = new SolidClientStaticAuthRegistrationHandler(
    httpHandler,
    client_id_constructor,
    client_secret,
    redirect_uri_constructor
  );

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
  let context: HttpHandlerContext;
  let url: URL;

  beforeAll(() => fetchMock.enableMocks());

  beforeEach(async () => {

    httpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValueOnce(of()),
      safeHandle: jest.fn(),
    };

    url = new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
    context = { request: { headers, body: {}, method: 'POST', url } };

  });

  it('should be correctly instantiated', () => {

    expect(solidClientStaticAuthRegistrationHandler).toBeTruthy();

  });

  it('should error when no handler, clientId, clientSecret or redirectUri are provided', () => {

    expect(() => new SolidClientStaticAuthRegistrationHandler(undefined, client_id_constructor, client_secret, redirect_uri_constructor)).toThrow('No handler was provided');
    expect(() => new SolidClientStaticAuthRegistrationHandler(null, client_id_constructor, client_secret, redirect_uri_constructor)).toThrow('No handler was provided');
    expect(() => new SolidClientStaticAuthRegistrationHandler(httpHandler, undefined, client_secret, redirect_uri_constructor)).toThrow('No clientID was provided');
    expect(() => new SolidClientStaticAuthRegistrationHandler(httpHandler, null, client_secret, redirect_uri_constructor)).toThrow('No clientID was provided');
    expect(() => new SolidClientStaticAuthRegistrationHandler(httpHandler, client_id_constructor, undefined, redirect_uri_constructor)).toThrow('No clientSecret was provided');
    expect(() => new SolidClientStaticAuthRegistrationHandler(httpHandler, client_id_constructor, null, redirect_uri_constructor)).toThrow('No clientSecret was provided');
    expect(() => new SolidClientStaticAuthRegistrationHandler(httpHandler, client_id_constructor, client_secret, undefined)).toThrow('No redirectUri was provided');
    expect(() => new SolidClientStaticAuthRegistrationHandler(httpHandler, client_id_constructor, client_secret, null)).toThrow('No redirectUri was provided');

  });

  it('should error when redirectUri is not a valid URI', () => {

    expect(() => new SolidClientStaticAuthRegistrationHandler(httpHandler, client_id_constructor, client_secret, 'notAValidURI')).toThrow('redirectUri must be a valid URI');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => solidClientStaticAuthRegistrationHandler.handle(undefined).toPromise()).rejects.toThrow('A context must be provided');
      await expect(() => solidClientStaticAuthRegistrationHandler.handle(null).toPromise()).rejects.toThrow('A context must be provided');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => solidClientStaticAuthRegistrationHandler.handle({ ...context, request: null }).toPromise()).rejects.toThrow('No request was included in the context');
      await expect(() => solidClientStaticAuthRegistrationHandler.handle({ ...context, request: undefined }).toPromise()).rejects.toThrow('No request was included in the context');

    });

    it('should error when no client_id was provided', async () => {

      const noClientIdURL = new URL(url.href);
      const noClientIdContext = { ... context, request: { ...context.request, url: noClientIdURL } };

      noClientIdContext.request.url.searchParams.set('client_id', '');
      await expect(() => solidClientStaticAuthRegistrationHandler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');

      noClientIdContext.request.url.searchParams.delete('client_id');
      await expect(() => solidClientStaticAuthRegistrationHandler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');

    });

    it('should pass the request on to the nested handler if the client_id is not a valid URL', async () => {

      const response = { body: 'mockBody', status: 200, headers: {} };
      httpHandler.handle = jest.fn().mockReturnValueOnce(of(response));

      url.searchParams.set('client_id', 'static_client');
      context = { ...context, request: { ...context.request, url } };
      await expect(solidClientStaticAuthRegistrationHandler.handle(context).toPromise()).resolves.toEqual(response);

    });

    it('should error when no redirect_uri was provided', async () => {

      const noRedirectUriURL = new URL(url.href);
      const noRedirectUriContext = { ... context, request: { ...context.request, url: noRedirectUriURL } };

      noRedirectUriContext.request.url.searchParams.set('redirect_uri', '');
      await expect(() => solidClientStaticAuthRegistrationHandler.handle(noRedirectUriContext).toPromise()).rejects.toThrow('No redirect_uri was provided');

      noRedirectUriContext.request.url.searchParams.delete('redirect_uri');
      await expect(() => solidClientStaticAuthRegistrationHandler.handle(noRedirectUriContext).toPromise()).rejects.toThrow('No redirect_uri was provided');

    });

    it('should error when return type is not turtle', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/html' }, status: 200 });

      const badIdContext = { ...context, request: { ...context.request, url: differentClientIdURL } };
      await expect(solidClientStaticAuthRegistrationHandler.handle(badIdContext).toPromise()).rejects.toThrow(`Incorrect content-type: expected text/turtle but got text/html`);

    });

    it('should error when the webId is not valid', async () => {

      fetchMock.once(podText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await expect(solidClientStaticAuthRegistrationHandler.handle(context).toPromise()).rejects.toThrow(`Not a valid webID: No oidcRegistration field found`);

    });

    it('should switch the context client id & add the secret given in the constructor', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await solidClientStaticAuthRegistrationHandler.handle(context).toPromise();

      expect(context.request.url.searchParams.get('client_id')).toEqual(client_id_constructor);
      expect(context.request.url.searchParams.get('client_secret')).toEqual(client_secret);

    });

  });

  describe('canHandle', () => {

    it('should return true if correct context was provided', async () => {

      await expect(solidClientStaticAuthRegistrationHandler.canHandle(context).toPromise()).resolves.toEqual(true);

    });

    it('should return false if no context was provided', async () => {

      await expect(solidClientStaticAuthRegistrationHandler.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(solidClientStaticAuthRegistrationHandler.canHandle(undefined).toPromise()).resolves.toEqual(false);

    });

    it('should return false if no request was provided', async () => {

      await expect(solidClientStaticAuthRegistrationHandler.canHandle({ ...context, request: null })
        .toPromise()).resolves.toEqual(false);

      await expect(solidClientStaticAuthRegistrationHandler.canHandle({ ...context, request: undefined })
        .toPromise()).resolves.toEqual(false);

    });

  });

});
