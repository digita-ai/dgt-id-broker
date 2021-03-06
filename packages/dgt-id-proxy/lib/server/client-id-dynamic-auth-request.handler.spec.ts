import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import fetchMock from 'jest-fetch-mock';
import { lastValueFrom } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { KeyValueStore } from '../storage/key-value-store';
import { OidcClientMetadata } from '../util/oidc-client-metadata';
import { OidcClientRegistrationResponse } from '../util/oidc-client-registration-response';
import { RegistrationStore } from '../util/process-client-registration-data';
import { ClientIdDynamicAuthRequestHandler } from './client-id-dynamic-auth-request.handler';

describe('ClientIdDynamicAuthRequestHandler', () => {

  const code_challenge_value = 'F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ';
  const code_challenge_method_value = 'S256';

  const store: RegistrationStore = new InMemoryStore();

  const referer = 'client.example.com';
  const client_id = 'http://client.example.com/clientapp/profile';
  const public_id = 'http://www.w3.org/ns/solid/terms#PublicOidcClient';
  const different_client_id = 'http://solidpod.com/vandenberghenjasper/profile/card#me';
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
    client_name: 'My Demo Application',
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

  const mockPublicRegisterResponse = {
    application_type: 'web',
    grant_types: [ 'authorization_code' ],
    id_token_signed_response_alg: 'RS256',
    post_logout_redirect_uris: [],
    require_auth_time: false,
    response_types: [ 'code' ],
    subject_type: 'public',
    token_endpoint_auth_method: 'none',
    require_signed_request_object: false,
    request_uris: [],
    client_id_issued_at: 1622625548,
    client_id: 'tDbuaFL4qlr2OqxgeSbUQ',
    redirect_uris: [ 'http://localhost:3001/requests.html' ],
    registration_client_uri: 'http://localhost:3000/reg/tDbuaFL4qlr2OqxgeSbUQ',
    registration_access_token: 'rDKH3mSAdtUoHXTOVvtVANRavkGbaFKExsPe_88Ycpn',
  };

  const mockAlternativeRegisterResponse = {
    application_type: 'web',
    client_name: 'New client name',
    grant_types: [ 'refresh_token', 'authorization_code' ],
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

  const clientRegistrationData = JSON.stringify({
    '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',

    client_id,
    'redirect_uris' : [ redirect_uri ],
    'client_name' : 'My Demo Application',
    'client_uri' : 'https://app.example/',
    'logo_uri' : 'https://app.example/logo.png',
    'tos_uri' : 'https://app.example/tos.html',
    'scope' : 'openid offline_access',
    'grant_types' : [ 'refresh_token', 'authorization_code' ],
    'response_types' : [ 'code' ],
    'default_max_age' : 60000,
    'require_auth_time' : true,
  });

  const clientRegistrationDataNewClientName = JSON.stringify({
    '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',

    client_id,
    'redirect_uris' : [ redirect_uri ],
    'client_name' : 'New client name',
    'client_uri' : 'https://app.example/',
    'logo_uri' : 'https://app.example/logo.png',
    'tos_uri' : 'https://app.example/tos.html',
    'scope' : 'openid offline_access',
    'grant_types' : [ 'refresh_token', 'authorization_code' ],
    'response_types' : [ 'code' ],
    'default_max_age' : 60000,
    'require_auth_time' : true,
  });

  const differentClientIdURL= new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(different_client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
  const differentRedirectUriURL= new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(different_redirect_uri)}`);
  const otherResponseTypeURL = new URL(`http://${host}/${endpoint}?response_type=plain&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);

  let context: HttpHandlerContext;
  let url: URL;
  let handler: ClientIdDynamicAuthRequestHandler;
  let publicClientURL: URL;

  beforeAll(() => fetchMock.enableMocks());

  beforeEach(async () => {

    publicClientURL = new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(public_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
    url = new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
    context = { request: { headers: {}, body: {}, method: 'POST', url } };

    handler = new ClientIdDynamicAuthRequestHandler(
      registration_uri,
      store
    );

  });

  afterEach(() => store.delete(client_id));

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no registration_uri or store was provided', () => {

    expect(() => new ClientIdDynamicAuthRequestHandler(undefined, store)).toThrow('A registration_uri must be provided');
    expect(() => new ClientIdDynamicAuthRequestHandler(null, store)).toThrow('A registration_uri must be provided');
    expect(() => new ClientIdDynamicAuthRequestHandler(registration_uri, undefined)).toThrow('A store must be provided');
    expect(() => new ClientIdDynamicAuthRequestHandler(registration_uri, null)).toThrow('A store must be provided');

  });

  it('should error when no registration uri was provided', () => {

    expect(() => new ClientIdDynamicAuthRequestHandler('htp//:incorrecturi.com', store)).toThrow('The provided registration_uri is not a valid URL');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => lastValueFrom(handler.handle(undefined))).rejects.toThrow('A context must be provided');
      await expect(() => lastValueFrom(handler.handle(null))).rejects.toThrow('A context must be provided');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: null }))).rejects.toThrow('No request was included in the context');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: undefined }))).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request url is provided', async () => {

      context.request.url = null;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No url was included in the request');
      context.request.url = undefined;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No url was included in the request');

    });

    it('should error when no client_id was provided', async () => {

      const noClientIdURL = new URL(url.href);
      const noClientIdContext = { ... context, request: { ...context.request, url: noClientIdURL } };

      noClientIdContext.request.url.searchParams.set('client_id', '');
      await expect(() => lastValueFrom(handler.handle(noClientIdContext))).rejects.toThrow('No client_id was provided');

      noClientIdContext.request.url.searchParams.delete('client_id');
      await expect(() => lastValueFrom(handler.handle(noClientIdContext))).rejects.toThrow('No client_id was provided');

    });

    it('should error when no redirect_uri was provided', async () => {

      const noRedirectUriURL = new URL(url.href);
      const noRedirectUriContext = { ... context, request: { ...context.request, url: noRedirectUriURL } };

      noRedirectUriContext.request.url.searchParams.set('redirect_uri', '');
      await expect(() => lastValueFrom(handler.handle(noRedirectUriContext))).rejects.toThrow('No redirect_uri was provided');

      noRedirectUriContext.request.url.searchParams.delete('redirect_uri');
      await expect(() => lastValueFrom(handler.handle(noRedirectUriContext))).rejects.toThrow('No redirect_uri was provided');

    });

    it('should return the context unedited if the client_id is not a valid URL', async () => {

      url.searchParams.set('client_id', 'static_client');
      context = { ...context, request: { ...context.request, url } };
      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual(context);

    });

    it('should error when return type is not json', async () => {

      fetchMock.once(clientRegistrationData, { headers: { 'content-type':'text/html' }, status: 200 });

      const badIdContext = { ...context, request: { ...context.request, url: differentClientIdURL } };
      await expect(lastValueFrom(handler.handle(badIdContext))).rejects.toThrow(`Incorrect content-type: expected application/ld+json but got text/html`);

    });

    it('should error when response types do not match', async () => {

      fetchMock.once(clientRegistrationData, { headers: { 'content-type':'application/ld+json' }, status: 200 });

      const badResponseTypeContext = { ...context, request: { ...context.request, url: otherResponseTypeURL } };
      await expect(lastValueFrom(handler.handle(badResponseTypeContext))).rejects.toThrow(`Response types do not match`);

    });

    it('should use the redirect_uri as key for the store if a public webid is used', async () => {

      const public_store: KeyValueStore<string, OidcClientMetadata & OidcClientRegistrationResponse>
      = new InMemoryStore();

      const handler2
      = new ClientIdDynamicAuthRequestHandler(registration_uri, public_store);

      fetchMock.once(JSON.stringify(mockPublicRegisterResponse), { status: 200 });

      public_store.set = jest.fn();

      await lastValueFrom(handler2.handle({ ...context, request: { ...context.request, url: publicClientURL } }));

      expect(public_store.set).toHaveBeenCalledWith(redirect_uri, mockPublicRegisterResponse);

    });

    it('should check the redirect uri and not register if a public webid was used', async () => {

      const public_store: KeyValueStore<string, OidcClientMetadata & OidcClientRegistrationResponse>
      = new InMemoryStore();

      const handler2
      = new ClientIdDynamicAuthRequestHandler(registration_uri, public_store);

      const newContext: HttpHandlerContext = { request: { headers: {}, body: {}, method: 'POST', url: publicClientURL } };
      public_store.set(redirect_uri, mockPublicRegisterResponse);

      const registeredInfo = public_store.get(redirect_uri);

      handler2.registerClient
       = jest.fn().mockReturnValue(mockPublicRegisterResponse);

      public_store.get = jest.fn().mockReturnValueOnce(registeredInfo);

      await lastValueFrom(handler2.handle({ ...newContext, request: { ...newContext.request, url: publicClientURL } }));

      expect(handler2.registerClient).toHaveBeenCalledTimes(0);

    });

    it('should not register if already registered and nothing changed', async () => {

      store.set(client_id, mockRegisterResponse);

      fetchMock.once(clientRegistrationData, { headers: { 'content-type':'application/ld+json' }, status: 200 });

      handler.registerClient = jest.fn();

      await lastValueFrom(handler.handle(context));

      expect(handler.registerClient).toHaveBeenCalledTimes(0);

    });

    it('should error if client id is not the same as in the client registration data', async () => {

      fetchMock.once(clientRegistrationData, { headers: { 'content-type':'application/ld+json' }, status: 200 });

      await expect(lastValueFrom(handler.handle({ ...context, request: { ...context.request, url: differentClientIdURL } }))).rejects.toThrow('The client id in the request does not match the one in the client registration data');

    });

    it('should error if redirect uri is not the same as in the client registration data', async () => {

      fetchMock.once(clientRegistrationData, { headers: { 'content-type':'application/ld+json' }, status: 200 });

      await expect(lastValueFrom(handler.handle({ ...context, request: { ...context.request, url: differentRedirectUriURL } }))).rejects.toThrow('The redirect_uri in the request is not included in the client registration data');

    });

    it('should error when no jsonld context was found', async () => {

      fetchMock.once(JSON.stringify({ ...JSON.parse(clientRegistrationData), '@context': undefined }), { headers: { 'content-type':'application/ld+json' }, status: 200 });

      await expect(lastValueFrom(handler.handle(context))).rejects.toThrow('client registration data should use the normative JSON-LD @context');

    });

    it('should save the registered client data in the store', async () => {

      fetchMock.mockResponses([ clientRegistrationData, { headers: { 'content-type':'application/ld+json' }, status: 201 } ], [ JSON.stringify(mockRegisterResponse), { status: 200 } ]);
      await lastValueFrom(handler.handle(context));
      await store.get(client_id).then((data) => expect(data).toBeDefined());

    });

    it('should register with new redirect uri if client_id is already registered in the store', async () => {

      fetchMock.mockResponses([ JSON.stringify({ ...JSON.parse(clientRegistrationData), 'redirect_uris': [ different_redirect_uri ] }), { headers: { 'content-type':'application/ld+json' }, status: 201 } ], [ JSON.stringify(mockAlternativeRegisterResponse), { status: 200 } ]);
      store.set(client_id, mockRegisterResponse);

      await lastValueFrom(handler
        .handle({ ...context, request: { ...context.request, url: differentRedirectUriURL } }));

      await store.get(client_id).then((data) => {

        expect(data.redirect_uris.includes(different_redirect_uri));

      });

    });

    it('should register with the new client name if client_id is already registered in the store', async () => {

      fetchMock.mockResponses([ clientRegistrationDataNewClientName, { headers: { 'content-type':'application/ld+json' }, status: 201 } ], [ JSON.stringify(mockAlternativeRegisterResponse), { status: 200 } ]);
      store.set(client_id, mockRegisterResponse);

      await lastValueFrom(handler
        .handle(context));

      await store.get(client_id).then((data) => {

        expect(data.client_name).toEqual('New client name');

      });

    });

  });

  describe('canHandle', () => {

    it('should return true if correct context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(true);

    });

    it('should return false if no context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(null))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle(undefined))).resolves.toEqual(false);

    });

    it('should return false if no request was provided', async () => {

      await expect(lastValueFrom(handler.canHandle({ ...context, request: null }))).resolves.toEqual(false);

      await expect(lastValueFrom(handler.canHandle({ ...context, request: undefined }))).resolves.toEqual(false);

    });

  });

  describe('registerClient', () => {

    it('should successfully return a response with register info', async () => {

      fetchMock.once(JSON.stringify(mockRegisterResponse), { status: 200 });

      const responseGotten = await handler.registerClient(reqData, client_id);
      expect(responseGotten.registration_access_token).toBeDefined();

    });

  });

});
