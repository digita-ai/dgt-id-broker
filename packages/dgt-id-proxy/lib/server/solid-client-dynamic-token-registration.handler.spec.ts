import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import {  of } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { KeyValueStore } from '../storage/key-value-store';
import { recalculateContentLength } from '../util/recalculate-content-length';
import { SolidClientDynamicTokenRegistrationHandler } from './solid-client-dynamic-token-registration.handler';

describe('SolidClientDynamicTokenRegistrationHandler', () => {

  const httpHandler = {
    canHandle: jest.fn(),
    handle: jest.fn().mockReturnValueOnce(of()),
    safeHandle: jest.fn(),
  };

  const store: KeyValueStore<string, any> = new InMemoryStore();
  const solidClientDynamicTokenRegistrationHandler = new SolidClientDynamicTokenRegistrationHandler(store, httpHandler);
  const referer = 'http://client.example.com';
  const url =  new URL(`${referer}/token`);
  const code_verifier = 'hmWgQqnBMBeK23cGJvJko9rdIZrNfuvCsZ43uNzdMQhs3HVU6Q4yWvVji3pftn9rz3xDwcPTYgtwi2SXBrvfsrlP4xcQftpd1Yj23ocpTRMAYUU6ptqmsTCRV6Q8DtkT';
  const code = 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET';
  const redirect_uri = 'http://client.example.com/requests.html';
  const client_id = 'http://solidpod./jaspervandenberghen/profile/card#me';
  const requestBody = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const swappedBody = `grant_type=authorization_code&code=${code}&client_id=jnO4LverDPv4AP2EghUSG&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const noClientIDRequestBody = `grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}&code_verifier=${code_verifier}`;
  const headers = { 'content-length': '302', 'content-type': 'application/json;charset=utf-8' };
  const context = { request: { headers, body: requestBody, method: 'POST', url } } as HttpHandlerContext;
  const newContext = { request: { headers, body: swappedBody, method: 'POST', url } } as HttpHandlerContext;

  const registerInfo = {
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
    client_id_issued_at: 1620736954,
    client_id: 'jnO4LverDPv4AP2EghUSG',
    client_uri: 'https://app.example/',
    default_max_age: 60000,
    logo_uri: 'https://app.example/logo.png',
    redirect_uris: [ 'http://localhost:3001/requests.html' ],
    scope: 'openid offline_access',
    tos_uri: 'https://app.example/tos.html',
    registration_client_uri: 'http://localhost:3000/reg/jnO4LverDPv4AP2EghUSG',
    registration_access_token: 'ykD4UbiaGtWmMvy7_G6PGKGc-UNCoV4fciKEZw6AHGq',
  };

  beforeEach(async() => {
    store.set(client_id, registerInfo);
  });

  it('should be correctly instantiated', () => {
    expect(solidClientDynamicTokenRegistrationHandler).toBeTruthy();
  });

  it('should error when no handler was provided', () => {
    expect(() => new SolidClientDynamicTokenRegistrationHandler(store, undefined)).toThrow('A HttpHandler must be provided');
    expect(() => new SolidClientDynamicTokenRegistrationHandler(store, null)).toThrow('A HttpHandler must be provided');
  });

  it('should error when no store was provided', () => {
    expect(() => new SolidClientDynamicTokenRegistrationHandler(undefined, solidClientDynamicTokenRegistrationHandler)).toThrow('A store must be provided');
    expect(() => new SolidClientDynamicTokenRegistrationHandler(null, solidClientDynamicTokenRegistrationHandler)).toThrow('A store must be provided');
  });

  describe('handle', () => {
    it('should error when no context was provided', async () => {
      await expect(() => solidClientDynamicTokenRegistrationHandler.handle(undefined).toPromise()).rejects.toThrow('A context must be provided');
      await expect(() => solidClientDynamicTokenRegistrationHandler.handle(null).toPromise()).rejects.toThrow('A context must be provided');
    });

    it('should error when no context request is provided', async () => {
      await expect(() => solidClientDynamicTokenRegistrationHandler.handle({ ...context, request: null }).toPromise()).rejects.toThrow('No request was included in the context');
      await expect(() => solidClientDynamicTokenRegistrationHandler.handle({ ...context, request: undefined }).toPromise()).rejects.toThrow('No request was included in the context');
    });

    it('should error when no request body is provided', async () => {
      await expect(() => solidClientDynamicTokenRegistrationHandler.handle({ ...context, request: { ...context.request, body: null } }).toPromise()).rejects.toThrow('No body was included in the request');
      await expect(() => solidClientDynamicTokenRegistrationHandler.handle({ ...context, request: { ...context.request, body: undefined } }).toPromise()).rejects.toThrow('No body was included in the request');
    });

    it('should error when no client_id was provided', async () => {
      const noClientIdContext = { ... context, request: { ...context.request, body:  noClientIDRequestBody } };
      await expect(() => solidClientDynamicTokenRegistrationHandler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');
    });

    it('should error when no data was found in the store', async () => {
      store.delete(client_id);
      await expect(() => solidClientDynamicTokenRegistrationHandler.handle(context).toPromise()).rejects.toThrow('No data was found in the store');
    });

    it('should replace the client_id with the registered one & change the content length', async () => {
      const length = recalculateContentLength(newContext.request);
      await solidClientDynamicTokenRegistrationHandler.handle(context).toPromise();

      expect(httpHandler.handle).toHaveBeenCalledTimes(1);
      expect(httpHandler.handle).toHaveBeenCalledWith({ ...newContext, request: { ...newContext.request, headers: { 'content-length': length, 'content-type': 'application/json;charset=utf-8' } } });
    });
  });

  describe('canHandle', () => {
    it('should return true if correct context was provided', async () => {
      await expect(solidClientDynamicTokenRegistrationHandler.canHandle(context).toPromise()).resolves.toEqual(true);
    });

    it('should return false if no context was provided', async () => {
      await expect(solidClientDynamicTokenRegistrationHandler.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(solidClientDynamicTokenRegistrationHandler.canHandle(undefined).toPromise())
        .resolves.toEqual(false);
    });

    it('should return false if no request was provided', async () => {
      await expect(solidClientDynamicTokenRegistrationHandler.canHandle({ ...context, request: null })
        .toPromise()).resolves.toEqual(false);
      await expect(solidClientDynamicTokenRegistrationHandler.canHandle({ ...context, request: undefined })
        .toPromise()).resolves.toEqual(false);
    });

    it('should return false if no request body was provided', async () => {
      await expect(solidClientDynamicTokenRegistrationHandler
        .canHandle({ ...context, request: { ...context.request, body: null } })
        .toPromise()).resolves.toEqual(false);
      await expect(solidClientDynamicTokenRegistrationHandler
        .canHandle({ ...context, request: { ...context.request, body: undefined } })
        .toPromise()).resolves.toEqual(false);
    });
  });
});
