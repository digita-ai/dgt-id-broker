import { BadRequestHttpError, ForbiddenHttpError, HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { KeyValueStore } from '../storage/key-value-store';
import { SolidClientDynamicRegistrationHandler } from './solid-client-dynamic-registration.handler';

describe('SolidClientDynamicRegistrationHandler', () => {

  const httpHandler: HttpHandler = {
    canHandle: jest.fn(),
    handle: jest.fn().mockReturnValueOnce(of()),
    safeHandle: jest.fn(),
  };

  const code_challenge_value = 'F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ';
  const code_challenge_method_value = 'S256';
  const store: KeyValueStore<string, HttpHandlerResponse> = new InMemoryStore();
  const referer = 'localhost:3001';
  const client_id = 'http://localhost:3002/jaspervandenberghen/profile/card#me';
  const different_client_id = 'http://localhost:3002/vandenberghenjasper/profile/card#me';
  const incorrectClient_id = 'jaspervandenberghen/profile/card#me';
  const redirect_uri = `http://${referer}/requests.html`;
  const different_redirect_uri = `http://${referer}/otherCallback.html`;
  const endpoint = 'auth';
  const host = 'server.example.com';

  const reqData = {
    'redirect_uris': [ redirect_uri ],
    'client_uri': 'https://app.example/',
    'scope': 'openid offline_access',
    'grant_types': [ 'refresh_token', 'authorization_code' ],
    'token_endpoint_auth_method' : 'none',
  };

  const podText = `@prefix foaf: <http://xmlns.com/foaf/0.1/>.
  @prefix solid: <http://www.w3.org/ns/solid/terms#>.
  
  <>
      a foaf:PersonalProfileDocument;
      foaf:maker <http://localhost:3002/jaspervandenberghen/profile/card#me>;
      foaf:primaryTopic <http://localhost:3002/jaspervandenberghen/profile/card#me>.
  
  <http://localhost:3002/jaspervandenberghen/profile/card#me>
      a foaf:Person;
      foaf:name "Jasper Vandenberghen";
      solid:oidcIssuer <http://localhost:3000/> ;
      solid:oidcIssuerRegistrationToken "" .
      
      `;

  const oidcRegistration = `<#id> solid:oidcRegistration """{"client_id" : "${client_id}","redirect_uris" : ["${redirect_uri}"],"client_name" : "My Panva Application", "client_uri" : "https://app.example/","logo_uri" : "https://app.example/logo.png","tos_uri" : "https://app.example/tos.html","scope" : "openid offline_access","grant_types" : ["refresh_token","authorization_code"],"response_types" : ["code"],"default_max_age" : 60000,"require_auth_time" : true}""" .`;
  const correctPodText = podText + ' ' + oidcRegistration;

  const incorrectClientIdURL= new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(incorrectClient_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
  const differentClientIdURL= new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(different_client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);

  let context: HttpHandlerContext;
  let url: URL;
  let solidClientDynamicRegistrationHandler: SolidClientDynamicRegistrationHandler;

  beforeEach(async () => {
    context = { request: { headers: {}, body: {}, method: 'POST', url } };
    url = new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
    solidClientDynamicRegistrationHandler = new SolidClientDynamicRegistrationHandler(store, httpHandler);
  });

  it('should be correctly instantiated', () => {
    expect(solidClientDynamicRegistrationHandler).toBeTruthy();
  });

  it('should error when no handler was provided', () => {
    expect(() => new SolidClientDynamicRegistrationHandler(store, undefined)).toThrow('A HttpHandler must be provided');
    expect(() => new SolidClientDynamicRegistrationHandler(store, null)).toThrow('A HttpHandler must be provided');
  });

  it('should error when no store was provided', () => {
    expect(() => new SolidClientDynamicRegistrationHandler(undefined, solidClientDynamicRegistrationHandler)).toThrow('A store must be provided');
    expect(() => new SolidClientDynamicRegistrationHandler(null, solidClientDynamicRegistrationHandler)).toThrow('A store must be provided');
  });

  describe('handle', () => {
    it('should error when no context was provided', async () => {
      await expect(() => solidClientDynamicRegistrationHandler.handle(undefined).toPromise()).rejects.toThrow('A context must be provided');
      await expect(() => solidClientDynamicRegistrationHandler.handle(null).toPromise()).rejects.toThrow('A context must be provided');
    });

    it('should error when no context request is provided', async () => {
      await expect(() => solidClientDynamicRegistrationHandler.handle({ ...context, request: null }).toPromise()).rejects.toThrow('No request was included in the context');
      await expect(() => solidClientDynamicRegistrationHandler.handle({ ...context, request: undefined }).toPromise()).rejects.toThrow('No request was included in the context');
    });

    it('should error when no client_id was provided', async () => {
      const noClientIdURL = new URL(url.href);
      const noClientIdContext = { ... context, request: { ...context.request, url: noClientIdURL } };

      noClientIdContext.request.url.searchParams.set('client_id', '');
      await expect(() => solidClientDynamicRegistrationHandler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');

      noClientIdContext.request.url.searchParams.delete('client_id');
      await expect(() => solidClientDynamicRegistrationHandler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');
    });

    it('should error when client_id is not a valid URL', async () => {
      const invalidClientIdURLContext = { ... context, request: { ...context.request, url: incorrectClientIdURL } };
      await expect(() => solidClientDynamicRegistrationHandler.handle(invalidClientIdURLContext).toPromise()).rejects.toThrow('The provided client_id is not a valid URL');
    });

    it('should error when no redirect_uri was provided', async () => {
      const noRedirectUriURL = new URL(url.href);
      const noRedirectUriContext = { ... context, request: { ...context.request, url: noRedirectUriURL } };

      noRedirectUriContext.request.url.searchParams.set('redirect_uri', '');
      await expect(() => solidClientDynamicRegistrationHandler.handle(noRedirectUriContext).toPromise()).rejects.toThrow('No redirect_uri was provided');

      noRedirectUriContext.request.url.searchParams.delete('redirect_uri');
      await expect(() => solidClientDynamicRegistrationHandler.handle(noRedirectUriContext).toPromise()).rejects.toThrow('No redirect_uri was provided');
    });

    it('should call the getPod', async () => {
      const responseGotten = await solidClientDynamicRegistrationHandler.getPod(client_id);
      solidClientDynamicRegistrationHandler.getPod = jest.fn().mockReturnValueOnce(of(responseGotten));
      await solidClientDynamicRegistrationHandler.handle(context).toPromise();

      expect(solidClientDynamicRegistrationHandler.getPod).toHaveBeenCalledTimes(1);
      expect(solidClientDynamicRegistrationHandler.getPod).toHaveBeenCalledWith(client_id);
    });

    it('should error when return type is not turtle', async () => {
      const responseGotten = await solidClientDynamicRegistrationHandler.getPod(different_client_id);
      solidClientDynamicRegistrationHandler.getPod = jest.fn().mockReturnValueOnce(of(responseGotten));
      const badIdContext = { ...context, request: { ...context.request, url: differentClientIdURL } };
      await expect(solidClientDynamicRegistrationHandler.handle(badIdContext).toPromise()).rejects.toThrow(`Incorrect content-type: expected text/turtle but got something else`);

    });

    it('should call validateWebID', async () => {
      solidClientDynamicRegistrationHandler.validateWebID = jest.fn().mockReturnValueOnce(of());
      await solidClientDynamicRegistrationHandler.handle(context).toPromise();
      expect(solidClientDynamicRegistrationHandler.validateWebID).toHaveBeenCalledTimes(1);
    });

    it('should call registerClient', async () => {
      solidClientDynamicRegistrationHandler.registerClient = jest.fn().mockReturnValueOnce(of());
      await solidClientDynamicRegistrationHandler.handle(context).toPromise();
      expect(solidClientDynamicRegistrationHandler.registerClient).toHaveBeenCalledTimes(1);
    });

    it('should save the registered client data in the store', async () => {
      solidClientDynamicRegistrationHandler.validateWebID = jest.fn().mockReturnValueOnce(of());
      solidClientDynamicRegistrationHandler.registerClient = jest.fn().mockReturnValueOnce(of());
      await solidClientDynamicRegistrationHandler.handle(context).toPromise();
      store.get(client_id).then((data) => expect(data).toBeDefined());
    });
  });

  describe('canHandle', () => {
    it('should return true if correct context was provided', async () => {
      await expect(solidClientDynamicRegistrationHandler.canHandle(context).toPromise()).resolves.toEqual(true);
    });

    it('should return false if no context was provided', async () => {
      await expect(solidClientDynamicRegistrationHandler.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(solidClientDynamicRegistrationHandler.canHandle(undefined).toPromise()).resolves.toEqual(false);
    });

    it('should return false if no request was provided', async () => {
      await expect(solidClientDynamicRegistrationHandler.canHandle({ ...context, request: null })
        .toPromise()).resolves.toEqual(false);
      await expect(solidClientDynamicRegistrationHandler.canHandle({ ...context, request: undefined })
        .toPromise()).resolves.toEqual(false);
    });
  });

  describe('registerClient', () => {
    it('should successfully return a response with register info', async () => {

      const responseGotten = await solidClientDynamicRegistrationHandler
        .registerClient(reqData);
      expect(responseGotten.registration_access_token).toBeDefined();
    });
  });

  describe('validateWebID', () => {
    it('should error when no oidcRegistration was found', async () => {
      const responseGotten = solidClientDynamicRegistrationHandler
        .validateWebID(podText, client_id, redirect_uri);

      await expect(responseGotten.toPromise()).rejects.toThrow('Not a valid webID: No oidcRegistration field found');
      await expect(responseGotten.toPromise()).rejects.toBeInstanceOf(BadRequestHttpError);
    });

    it('should error when request data does not match', async () => {
      let responseGotten = solidClientDynamicRegistrationHandler
        .validateWebID(correctPodText, different_client_id, redirect_uri);

      await expect(responseGotten.toPromise()).rejects.toThrow('The data in the request does not match the one in the WebId');
      await expect(responseGotten.toPromise()).rejects.toBeInstanceOf(ForbiddenHttpError);

      responseGotten = solidClientDynamicRegistrationHandler
        .validateWebID(correctPodText, client_id, different_redirect_uri);

      await expect(responseGotten.toPromise()).rejects.toThrow('The data in the request does not match the one in the WebId');
      await expect(responseGotten.toPromise()).rejects.toBeInstanceOf(ForbiddenHttpError);
    });

    it('should return a JSON of the podData if valid', async () => {

      const responseGotten = solidClientDynamicRegistrationHandler
        .validateWebID(correctPodText,  client_id, redirect_uri);

      const podData = {
        client_id: 'http://localhost:3002/jaspervandenberghen/profile/card#me',
        redirect_uris: [ 'http://localhost:3001/requests.html' ],
        client_name: 'My Panva Application',
        client_uri: 'https://app.example/',
        logo_uri: 'https://app.example/logo.png',
        tos_uri: 'https://app.example/tos.html',
        scope: 'openid offline_access',
        grant_types: [ 'refresh_token', 'authorization_code' ],
        response_types: [ 'code' ],
        default_max_age: 60000,
        require_auth_time: true,
      };

      await expect(responseGotten.toPromise()).resolves.toEqual(podData);
    });
  });

});

