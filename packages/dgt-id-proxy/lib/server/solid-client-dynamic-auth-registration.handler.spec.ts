import { ForbiddenHttpError, HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import fetchMock from 'jest-fetch-mock';
import { RegistrationResponseJSON } from '../util/registration-response-json';
import { InMemoryStore } from '../storage/in-memory-store';
import { KeyValueStore } from '../storage/key-value-store';
import { SolidClientDynamicAuthRegistrationHandler } from './solid-client-dynamic-auth-registration.handler';

describe('SolidClientDynamicAuthRegistrationHandler', () => {

  const httpHandler: HttpHandler = {
    canHandle: jest.fn(),
    handle: jest.fn().mockReturnValue(of()),
    safeHandle: jest.fn(),
  };

  const code_challenge_value = 'F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ';
  const code_challenge_method_value = 'S256';
  const store: KeyValueStore<string, Partial<RegistrationResponseJSON>> = new InMemoryStore();
  const referer = 'client.example.com';
  const client_id = 'http://solidpod.com/jaspervandenberghen/profile/card#me';
  const different_client_id = 'http://solidpod.com/vandenberghenjasper/profile/card#me';
  const incorrectClient_id = 'jaspervandenberghen/profile/card#me';
  const redirect_uri = `http://${referer}/requests.html`;
  const different_redirect_uri = `http://${referer}/otherCallback.html`;
  const endpoint = 'auth';
  const host = 'server.example.com';
  const registration_uri = 'http://oidc.com/reg';

  const reqData = {
    'redirect_uris': [ redirect_uri ],
    'token_endpoint_auth_method' : 'none',
  };

  const mockRegisterResponse = {
    application_type: 'web',
    grant_types: [ 'refresh_token', 'authorization_code' ],
    client_name: 'My Panva Application',
    scope: 'openid offline_access',
    tos_uri : 'https://app.example/tos.html',
    require_auth_time : true,
    id_token_signed_response_alg: 'RS256',
    response_types: [ 'code' ],
    subject_type: 'public',
    token_endpoint_auth_method: 'none',
    client_id: 'GMRBBg-KZ0jt6VI6LXfOy',
    client_uri: 'https://app.example/',
    default_max_age: 60000,
    logo_uri: 'https://app.example/logo.png',
    redirect_uris: [ 'http://client.example.com/requests.html' ],
    registration_client_uri: 'http://server.example.com/reg/GMRBBg-KZ0jt6VI6LXfOy',
    registration_access_token: 'bsuodFwxgBWR3qE-pyxNeNbDhN1CWBs6oZuqkAooUgb',
  };

  const mockAlternativeRegisterResponse = {
    application_type: 'web',
    client_name: 'My Panva Application',
    grant_types: [ 'refresh_token', 'authorization_code' ],
    scope: 'openid offline_access',
    id_token_signed_response_alg: 'RS256',
    response_types: [ 'code' ],
    subject_type: 'public',
    token_endpoint_auth_method: 'none',
    client_id: 'GMRBBg-KZ0jt6VI6LXfOy',
    client_uri: 'https://app.example/',
    default_max_age: 60000,
    logo_uri: 'https://app.example/logo.png',
    redirect_uris: [ different_redirect_uri ],
    registration_client_uri: 'http://server.example.com/reg/GMRBBg-KZ0jt6VI6LXfOy',
    registration_access_token: 'bsuodFwxgBWR3qE-pyxNeNbDhN1CWBs6oZuqkAooUgb',
  };

  const podText = `@prefix foaf: <http://xmlns.com/foaf/0.1/>.
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
  const noScopeOidcRegistration = `<#id> solid:oidcRegistration """{"client_id" : "${client_id}","redirect_uris" : ["${redirect_uri}"],"client_name" : "My Panva Application", "client_uri" : "https://app.example/","logo_uri" : "https://app.example/logo.png","tos_uri" : "https://app.example/tos.html", "grant_types" : ["refresh_token","authorization_code"],"response_types" : ["code"],"default_max_age" : 60000,"require_auth_time" : true}""" .`;
  const differentRedirectOidcRegistration = `<#id> solid:oidcRegistration """{"client_id" : "${client_id}","redirect_uris" : ["${different_redirect_uri}"],"client_name" : "My Panva Application", "client_uri" : "https://app.example/","logo_uri" : "https://app.example/logo.png","tos_uri" : "https://app.example/tos.html","scope" : "openid offline_access","grant_types" : ["refresh_token","authorization_code"],"response_types" : ["code"],"default_max_age" : 60000,"require_auth_time" : true}""" .`;

  const correctPodText = podText + '\n' + oidcRegistration;
  const noScopePodText = podText + '\n' + noScopeOidcRegistration;
  const differentRedirectUriPodText = podText + ' ' + differentRedirectOidcRegistration;

  const incorrectClientIdURL= new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(incorrectClient_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
  const differentClientIdURL= new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(different_client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
  const differentRedirectUriURL= new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(different_redirect_uri)}`);
  const otherScopeURL = new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=profile&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
  const otherResponseTypeURL = new URL(`http://${host}/${endpoint}?response_type=plain&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);

  let context: HttpHandlerContext;
  let url: URL;
  let solidClientDynamicAuthRegistrationHandler: SolidClientDynamicAuthRegistrationHandler;

  beforeAll(() => fetchMock.enableMocks());

  beforeEach(async () => {

    url = new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
    context = { request: { headers: {}, body: {}, method: 'POST', url } };

    solidClientDynamicAuthRegistrationHandler = new SolidClientDynamicAuthRegistrationHandler(
      registration_uri,
      store,
      httpHandler
    );

  });

  afterEach(() => store.delete(client_id));

  it('should be correctly instantiated', () => {

    expect(solidClientDynamicAuthRegistrationHandler).toBeTruthy();

  });

  it('should error when no handler was provided', () => {

    expect(() => new SolidClientDynamicAuthRegistrationHandler(registration_uri, store, undefined)).toThrow('A HttpHandler must be provided');
    expect(() => new SolidClientDynamicAuthRegistrationHandler(registration_uri, store, null)).toThrow('A HttpHandler must be provided');

  });

  it('should error when no store was provided', () => {

    expect(() => new SolidClientDynamicAuthRegistrationHandler(registration_uri, undefined, solidClientDynamicAuthRegistrationHandler)).toThrow('A store must be provided');
    expect(() => new SolidClientDynamicAuthRegistrationHandler(registration_uri, null, solidClientDynamicAuthRegistrationHandler)).toThrow('A store must be provided');

  });

  it('should error when no registration uri was provided', () => {

    expect(() => new SolidClientDynamicAuthRegistrationHandler(undefined, store, solidClientDynamicAuthRegistrationHandler)).toThrow('A registration_uri must be provided');
    expect(() => new SolidClientDynamicAuthRegistrationHandler(null, store, solidClientDynamicAuthRegistrationHandler)).toThrow('A registration_uri must be provided');

  });

  it('should error when no registration uri was provided', () => {

    expect(() => new SolidClientDynamicAuthRegistrationHandler('htp//:incorrecturi.com', store, solidClientDynamicAuthRegistrationHandler)).toThrow('The provided registration_uri is not a valid URL');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => solidClientDynamicAuthRegistrationHandler.handle(undefined).toPromise()).rejects.toThrow('A context must be provided');
      await expect(() => solidClientDynamicAuthRegistrationHandler.handle(null).toPromise()).rejects.toThrow('A context must be provided');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => solidClientDynamicAuthRegistrationHandler.handle({ ...context, request: null }).toPromise()).rejects.toThrow('No request was included in the context');
      await expect(() => solidClientDynamicAuthRegistrationHandler.handle({ ...context, request: undefined }).toPromise()).rejects.toThrow('No request was included in the context');

    });

    it('should error when no client_id was provided', async () => {

      const noClientIdURL = new URL(url.href);
      const noClientIdContext = { ... context, request: { ...context.request, url: noClientIdURL } };

      noClientIdContext.request.url.searchParams.set('client_id', '');
      await expect(() => solidClientDynamicAuthRegistrationHandler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');

      noClientIdContext.request.url.searchParams.delete('client_id');
      await expect(() => solidClientDynamicAuthRegistrationHandler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');

    });

    it('should error when client_id is not a valid URL', async () => {

      const invalidClientIdURLContext = { ... context, request: { ...context.request, url: incorrectClientIdURL } };
      await expect(() => solidClientDynamicAuthRegistrationHandler.handle(invalidClientIdURLContext).toPromise()).rejects.toThrow('The provided client_id is not a valid URL');

    });

    it('should error when no redirect_uri was provided', async () => {

      const noRedirectUriURL = new URL(url.href);
      const noRedirectUriContext = { ... context, request: { ...context.request, url: noRedirectUriURL } };

      noRedirectUriContext.request.url.searchParams.set('redirect_uri', '');
      await expect(() => solidClientDynamicAuthRegistrationHandler.handle(noRedirectUriContext).toPromise()).rejects.toThrow('No redirect_uri was provided');

      noRedirectUriContext.request.url.searchParams.delete('redirect_uri');
      await expect(() => solidClientDynamicAuthRegistrationHandler.handle(noRedirectUriContext).toPromise()).rejects.toThrow('No redirect_uri was provided');

    });

    it('should error when return type is not turtle', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/html' }, status: 200 });

      const badIdContext = { ...context, request: { ...context.request, url: differentClientIdURL } };
      await expect(solidClientDynamicAuthRegistrationHandler.handle(badIdContext).toPromise()).rejects.toThrow(`Incorrect content-type: expected text/turtle but got text/html`);

    });

    it('should error when provided scope is not found in the pod', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      const badScopeContext = { ...context, request: { ...context.request, url: otherScopeURL } };
      await expect(solidClientDynamicAuthRegistrationHandler.handle(badScopeContext).toPromise()).rejects.toThrow(new ForbiddenHttpError(`The provided scope was not found in your webid`));

    });

    it('should error when response types do not match', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      const badResponseTypeContext = { ...context, request: { ...context.request, url: otherResponseTypeURL } };
      await expect(solidClientDynamicAuthRegistrationHandler.handle(badResponseTypeContext).toPromise()).rejects.toThrow(`Response types do not match`);

    });

    it('should not register if already registered and nothing changed', async () => {

      store.set(client_id, mockRegisterResponse);

      httpHandler.handle = jest.fn().mockReturnValue(of(mockRegisterResponse));
      fetchMock.mockResponses([ correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 } ]);

      await expect(solidClientDynamicAuthRegistrationHandler
        .handle(context)
        .toPromise()).resolves
        .toEqual(mockRegisterResponse);

    });

    it('should error if client id is not the same as in the webid', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await expect(solidClientDynamicAuthRegistrationHandler.handle({ ...context, request: { ...context.request, url: differentClientIdURL } }).toPromise()).rejects.toThrow('The client id in the request does not match the one in the WebId');

    });

    it('should error if redirect uri is not the same as in the webid', async () => {

      fetchMock.once(correctPodText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await expect(solidClientDynamicAuthRegistrationHandler.handle({ ...context, request: { ...context.request, url: differentRedirectUriURL } }).toPromise()).rejects.toThrow('The redirect_uri in the request is not included in the WebId');

    });

    it('should error if no scope was defined in the webid', async () => {

      fetchMock.once(noScopePodText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await expect(solidClientDynamicAuthRegistrationHandler.handle(context).toPromise()).rejects.toThrow('No scope defined in the webid');

    });

    it('should error when no oidcRegistration was found', async () => {

      fetchMock.once(podText, { headers: { 'content-type':'text/turtle' }, status: 200 });

      await expect(solidClientDynamicAuthRegistrationHandler.handle(context).toPromise()).rejects.toThrow('Not a valid webID: No oidcRegistration field found');

    });

    it('should save the registered client data in the store', async () => {

      fetchMock.mockResponses([ correctPodText, { headers: { 'content-type':'text/turtle' }, status: 201 } ], [ JSON.stringify(mockRegisterResponse), { status: 200 } ]);
      await solidClientDynamicAuthRegistrationHandler.handle(context).toPromise();
      await store.get(client_id).then((data) => expect(data).toBeDefined());

    });

    it('should register with new data if client_id is already registered in the store', async () => {

      fetchMock.mockResponses([ differentRedirectUriPodText, { headers: { 'content-type':'text/turtle' }, status: 201 } ], [ JSON.stringify(mockAlternativeRegisterResponse), { status: 200 } ]);
      store.set(client_id, mockRegisterResponse);

      await solidClientDynamicAuthRegistrationHandler
        .handle({ ...context, request: { ...context.request, url: differentRedirectUriURL } })
        .toPromise();

      await store.get(client_id).then((data) => {

        expect(data.redirect_uris.includes(different_redirect_uri));

      });

    });

  });

  describe('canHandle', () => {

    it('should return true if correct context was provided', async () => {

      await expect(solidClientDynamicAuthRegistrationHandler.canHandle(context).toPromise()).resolves.toEqual(true);

    });

    it('should return false if no context was provided', async () => {

      await expect(solidClientDynamicAuthRegistrationHandler.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(solidClientDynamicAuthRegistrationHandler.canHandle(undefined).toPromise()).resolves.toEqual(false);

    });

    it('should return false if no request was provided', async () => {

      await expect(solidClientDynamicAuthRegistrationHandler.canHandle({ ...context, request: null })
        .toPromise()).resolves.toEqual(false);

      await expect(solidClientDynamicAuthRegistrationHandler.canHandle({ ...context, request: undefined })
        .toPromise()).resolves.toEqual(false);

    });

  });

  describe('registerClient', () => {

    it('should successfully return a response with register info', async () => {

      fetchMock.once(JSON.stringify(mockRegisterResponse), { status: 200 });

      const responseGotten = await solidClientDynamicAuthRegistrationHandler.registerClient(reqData);
      expect(responseGotten.registration_access_token).toBeDefined();

    });

  });

});
