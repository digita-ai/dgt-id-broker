import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import fetchMock from 'jest-fetch-mock';
import { KeyValueStore } from '../storage/key-value-store';
import { InMemoryStore } from '../storage/in-memory-store';
import { ClientIdStaticAuthRequestHandler } from './client-id-static-auth-request.handler';

describe('ClientIdStaticAuthRequestHandler', () => {

  const code_challenge_value = 'F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ';
  const code_challenge_method_value = 'S256';
  const client_id = 'http://solidpod.com/jaspervandenberghen/profile/card#me';
  const client_id_constructor = 'static_client';
  const redirect_uri_constructor = 'http://upstream.com/redirect';
  const different_client_id = 'http://solidpod.com/vandenberghenjasper/profile/card#me';
  const redirect_uri = 'http://client.com/requests.html';
  const differentClientIdURL= new URL(`http://client.com/auth?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(different_client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=1234`);
  const headers = { 'content-length': '302', 'content-type': 'application/json;charset=utf-8' };

  let handler: ClientIdStaticAuthRequestHandler;

  const podText = `
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.
    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
    <>
      a foaf:PersonalProfileDocument;
      foaf:maker <http://solidpod.com/jaspervandenberghen/profile/card#me>;
      foaf:primaryTopic <http://solidpod.com/jaspervandenberghen/profile/card#me>.
    <http://solidpod.com/jaspervandenberghen/profile/card#me>
      a foaf:Person;
      foaf:name "Jasper Vandenberghen".
  `;

  const oidcRegistration = `<#id> solid:oidcRegistration """{"client_id" : "${client_id}","redirect_uris" : ["${redirect_uri}"],"client_name" : "My Panva Application", "client_uri" : "https://app.example/","logo_uri" : "https://app.example/logo.png","tos_uri" : "https://app.example/tos.html","scope" : "openid offline_access","grant_types" : ["refresh_token","authorization_code"],"response_types" : ["code"],"default_max_age" : 60000,"require_auth_time" : true}""" .`;
  const correctPodText = podText + '\n' + oidcRegistration;
  let context: HttpHandlerContext;
  let url: URL;
  let store: KeyValueStore<string, URL>;

  beforeAll(() => fetchMock.enableMocks());

  beforeEach(async () => {

    store = new InMemoryStore();

    handler  = new ClientIdStaticAuthRequestHandler(
      client_id_constructor,
      redirect_uri_constructor,
      store
    );

    url = new URL(`http://client.com/auth?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=1234`);
    context = { request: { headers, body: {}, method: 'POST', url } };

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no handler, clientId, clientSecret, redirectUri or keyValueStore are provided', () => {

    expect(() => new ClientIdStaticAuthRequestHandler(undefined, redirect_uri_constructor, store)).toThrow('No clientId was provided');
    expect(() => new ClientIdStaticAuthRequestHandler(null, redirect_uri_constructor, store)).toThrow('No clientId was provided');
    expect(() => new ClientIdStaticAuthRequestHandler(client_id_constructor, undefined, store)).toThrow('No redirectUri was provided');
    expect(() => new ClientIdStaticAuthRequestHandler(client_id_constructor, null, store)).toThrow('No redirectUri was provided');
    expect(() => new ClientIdStaticAuthRequestHandler(client_id_constructor, redirect_uri_constructor, undefined)).toThrow('No keyValueStore was provided');
    expect(() => new ClientIdStaticAuthRequestHandler(client_id_constructor, redirect_uri_constructor, null)).toThrow('No keyValueStore was provided');

  });

  it('should error when redirectUri is not a valid URL', () => {

    expect(() => new ClientIdStaticAuthRequestHandler(client_id_constructor, 'notAValidURI', store)).toThrow('redirectUri must be a valid URI');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => handler.handle(undefined).toPromise()).rejects.toThrow('A context must be provided');
      await expect(() => handler.handle(null).toPromise()).rejects.toThrow('A context must be provided');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => handler.handle({ ...context, request: null }).toPromise()).rejects.toThrow('No request was included in the context');
      await expect(() => handler.handle({ ...context, request: undefined }).toPromise()).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request url is provided', async () => {

      context.request.url = null;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No url was included in the request');
      context.request.url = undefined;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No url was included in the request');

    });

    it('should error when no client_id was provided', async () => {

      const noClientIdURL = new URL(url.href);
      const noClientIdContext = { ... context, request: { ...context.request, url: noClientIdURL } };

      noClientIdContext.request.url.searchParams.set('client_id', '');
      await expect(() => handler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');

      noClientIdContext.request.url.searchParams.delete('client_id');
      await expect(() => handler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');

    });

    it('should return the request unedited if the client_id is not a valid URL', async () => {

      url.searchParams.set('client_id', 'static_client');
      context = { ...context, request: { ...context.request, url } };
      await expect(handler.handle(context).toPromise()).resolves.toEqual(context);

    });

    it('should error when no state is added to the request', async () => {

      url.searchParams.delete('state');
      context.request.url = url;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('Request must contain a state. Add state handlers to the proxy');

    });

    it('should add state to the store as key with clients redirect uri as value', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await expect(store.get('1234')).resolves.toBeUndefined();
      await handler.handle(context).toPromise();
      await expect(store.get('1234')).resolves.toEqual(new URL(redirect_uri));

    });

    it('should error when no redirect_uri was provided', async () => {

      context.request.url.searchParams.set('redirect_uri', '');
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No redirect_uri was provided');

      context.request.url.searchParams.delete('redirect_uri');
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No redirect_uri was provided');

    });

    it('should error when redirect_uri is not a valid URL', async () => {

      url.searchParams.set('redirect_uri', 'notAValidURL');
      context.request.url = url;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('redirect_uri must be a valid URL');

    });

    it('should change the client_id in the request if the client is public', async () => {

      url.searchParams.set('client_id', 'http://www.w3.org/ns/solid/terms#PublicOidcClient');
      context = { ... context, request: { ...context.request, url } };

      await handler.handle(context).toPromise();
      expect(context.request.url.searchParams.get('client_id')).toEqual(client_id_constructor);

    });

    it('should error when return type is not turtle', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/html' }, status: 200 });

      const badIdContext = { ...context, request: { ...context.request, url: differentClientIdURL } };
      await expect(handler.handle(badIdContext).toPromise()).rejects.toThrow(`Incorrect content-type: expected text/turtle but got text/html`);

    });

    it('should error when the webId is not valid', async () => {

      fetchMock.once(podText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await expect(handler.handle(context).toPromise()).rejects.toThrow(`Not a valid webID: No oidcRegistration field found`);

    });

    it('should switch the context client id given in the constructor', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await handler.handle(context).toPromise();

      expect(context.request.url.searchParams.get('client_id')).toEqual(client_id_constructor);

    });

  });

  describe('canHandle', () => {

    it('should return true if correct context was provided', async () => {

      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(true);

    });

    it('should return false if no context was provided', async () => {

      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(handler.canHandle(undefined).toPromise()).resolves.toEqual(false);

    });

    it('should return false if no request was provided', async () => {

      await expect(handler.canHandle({ ...context, request: null })
        .toPromise()).resolves.toEqual(false);

      await expect(handler.canHandle({ ...context, request: undefined })
        .toPromise()).resolves.toEqual(false);

    });

  });

});
