import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
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
  const client_id = encodeURIComponent('http://localhost:3002/jaspervandenberghen/profile/card#me');
  const incorrectClient_id = encodeURIComponent('jaspervandenberghen/profile/card#me');
  const redirect_uri = encodeURIComponent(`http://${referer}/requests.html`);
  const endpoint = 'auth';
  const host = 'server.example.com';

  const url = new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${client_id}&redirect_uri=${redirect_uri}`);
  const incorrectClientIdURL= new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${incorrectClient_id}&redirect_uri=${redirect_uri}`);
  const context: HttpHandlerContext = { request: { headers: {}, body: {
    application_type: 'web',
    grant_types: [ 'refresh_token', 'authorization_code' ],
    id_token_signed_response_alg: 'RS256',
    post_logout_redirect_uris: [],
    require_auth_time: true,
    response_types: [ 'code' ],
    subject_type: 'public',
    token_endpoint_auth_method: 'none',
    require_signed_request_object: false,
    request_uris: [],
    client_id_issued_at: 1620313101,
    client_id: 'Vbhf7LEuw3INWvNYSI6Va',
    client_uri: 'https://app.example/',
    default_max_age: 60000,
    logo_uri: 'https://app.example/logo.png',
    redirect_uris: [ 'http://localhost:3001/requests.html' ],
    scope: 'openid offline_access',
    tos_uri: 'https://app.example/tos.html',
  }, method: 'POST', url } };

  const solidClientDynamicRegistrationHandler = new SolidClientDynamicRegistrationHandler(store, httpHandler);

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

    // it('should get the webId from the pod', async () => {
    //   const res = {
    //     headers: { },
    //     status: 200,
    //   } as Response;

    //   await solidClientDynamicRegistrationHandler.handle(context).toPromise();
    //   solidClientDynamicRegistrationHandler.getPod = jest.fn().mockReturnValueOnce(res);
    //   expect(solidClientDynamicRegistrationHandler.getPod).toHaveBeenCalledTimes(1);
    // });
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

  describe('getPod', () => {
    // it('should return a turtle response with the podData', async () => {
    //   await solidClientDynamicRegistrationHandler.getPod(context.request.url.searchParams.get(client_id));
    //   expect(solidClientDynamicRegistrationHandler.getPod).toHaveBeenCalledWith('http://localhost:3002/jaspervandenberghen/profile/card#me');
    //   await expect(solidClientDynamicRegistrationHandler.getPod(context.request.url.searchParams.get(client_id))).resolves.toHaveReturnedWith()
    // });
  });

});
