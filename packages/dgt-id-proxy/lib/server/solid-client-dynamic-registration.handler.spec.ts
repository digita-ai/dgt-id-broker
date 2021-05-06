import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { KeyValueStore } from '../storage/key-value-store';
import { SolidClientDynamicRegistrationHandler } from './solid-client-dynamic-registration.handler';

describe('SolidClientDynamicRegistrationHandler', () => {
  let solidClientDynamicRegistrationHandler: SolidClientDynamicRegistrationHandler;
  let context: HttpHandlerContext;
  let httpHandler: HttpHandler;
  let store: KeyValueStore<string, string>;

  beforeEach(async () => {
    httpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValueOnce(of()),
      safeHandle: jest.fn(),
    } as HttpHandler;

    store = new InMemoryStore();
    solidClientDynamicRegistrationHandler = new SolidClientDynamicRegistrationHandler(store, httpHandler);

    const url = new URL(`http://example.com:3001/reg`);

    context = { request: { headers: {}, body: {
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
      client_id_issued_at: 1620136678,
      client_id: 'http://localhost:3002/jaspervandenberghen/profile/card#me',
      client_name: 'My Panva Application',
      client_uri: 'https://app.example/',
      default_max_age: 60000,
      logo_uri: 'https://app.example/logo.png',
      redirect_uris: [ 'http://localhost:3001/requests.html' ],
      scope: 'openid offline_access',
      tos_uri: 'https://app.example/tos.html',
      registration_client_uri: 'http://localhost:3000/reg/http://localhost:3002/jaspervandenberghen/profile/card#me',
      registration_access_token: 'TbaivMJxlyzf31i_3h7N3u2ycR83KZuBxeU2t7xRdfl',
    }, method: 'POST', url } };
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
      context.request = null;
      await expect(() => solidClientDynamicRegistrationHandler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
      context.request = undefined;
      await expect(() => solidClientDynamicRegistrationHandler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
    });

    it('should error when no context request body is provided', async () => {
      context.request.body = null;
      await expect(() => solidClientDynamicRegistrationHandler.handle(context).toPromise()).rejects.toThrow('No body was included in the request');
      context.request.body = undefined;
      await expect(() => solidClientDynamicRegistrationHandler.handle(context).toPromise()).rejects.toThrow('No body was included in the request');
    });

  });

});
