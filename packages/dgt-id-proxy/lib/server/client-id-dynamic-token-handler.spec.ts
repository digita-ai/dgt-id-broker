import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import {  of } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { KeyValueStore } from '../storage/key-value-store';
import { OidcClientMetadata } from '../util/oidc-client-metadata';
import { recalculateContentLength } from '../util/recalculate-content-length';
import { OidcClientRegistrationResponse } from '../util/oidc-client-registration-response';
import { ClientIdDynamicTokenHandler } from './client-id-dynamic-token.handler';

describe('ClientIdDynamicTokenHandler', () => {

  const referer = 'http://client.example.com';
  const url =  new URL(`${referer}/token`);
  const code_verifier = 'hmWgQqnBMBeK23cGJvJko9rdIZrNfuvCsZ43uNzdMQhs3HVU6Q4yWvVji3pftn9rz3xDwcPTYgtwi2SXBrvfsrlP4xcQftpd1Yj23ocpTRMAYUU6ptqmsTCRV6Q8DtkT';
  const code = 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET';
  const redirect_uri = 'http://client.example.com/requests.html';
  const client_id = 'http://solidpod./jaspervandenberghen/profile/card#me';
  const public_id = 'http://www.w3.org/ns/solid/terms#PublicOidcClient';
  const requestBody = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const requestBodyWithPublicId = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(public_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const swappedBody = `grant_type=authorization_code&code=${code}&client_id=jnO4LverDPv4AP2EghUSG&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const noClientIDRequestBody = `grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}&code_verifier=${code_verifier}`;
  const noRedirectURIRequestBody = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(client_id)}&code_verifier=${code_verifier}`;
  const headers = { 'content-length': '302', 'content-type': 'application/json;charset=utf-8' };
  const context = { request: { headers, body: requestBody, method: 'POST', url } } as HttpHandlerContext;
  const newContext = { request: { headers, body: swappedBody, method: 'POST', url } } as HttpHandlerContext;

  const response = {
    body: {
      access_token: {
        header: {},
        payload: {
          webid: client_id,
          'sub': '23121d3c-84df-44ac-b458-3d63a9a05497/|:$^?#{}[]',
        },
      },
      id_token: {
        header: {},
        payload: {
          webid: client_id,
        },
      },
    },
    headers: {},
    status: 200,
  };

  let httpHandler: HttpHandler;

  const store: KeyValueStore<string, Partial<OidcClientMetadata & OidcClientRegistrationResponse>>
  = new InMemoryStore();

  let handler: ClientIdDynamicTokenHandler;

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

    httpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValue(of(response)),
      safeHandle: jest.fn(),
    };

    handler = new ClientIdDynamicTokenHandler(store, httpHandler);

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no handler was provided', () => {

    expect(() => new ClientIdDynamicTokenHandler(store, undefined)).toThrow('A HttpHandler must be provided');
    expect(() => new ClientIdDynamicTokenHandler(store, null)).toThrow('A HttpHandler must be provided');

  });

  it('should error when no store was provided', () => {

    expect(() => new ClientIdDynamicTokenHandler(undefined, handler)).toThrow('A store must be provided');
    expect(() => new ClientIdDynamicTokenHandler(null, handler)).toThrow('A store must be provided');

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

    it('should error when no request body is provided', async () => {

      await expect(() => handler.handle({ ...context, request: { ...context.request, body: null } }).toPromise()).rejects.toThrow('No body was included in the request');
      await expect(() => handler.handle({ ...context, request: { ...context.request, body: undefined } }).toPromise()).rejects.toThrow('No body was included in the request');

    });

    it('should error when no client_id was provided', async () => {

      const noClientIdContext = { ... context, request: { ...context.request, body:  noClientIDRequestBody } };
      await expect(() => handler.handle(noClientIdContext).toPromise()).rejects.toThrow('No client_id was provided');

    });

    it('should error when no client_id was provided', async () => {

      const noRedirectURIContext = { ... context, request: { ...context.request, body:  noRedirectURIRequestBody } };
      await expect(() => handler.handle(noRedirectURIContext).toPromise()).rejects.toThrow('No redirect_uri was provided');

    });

    it('should pass the request on to the nested handler if the client_id is not a valid URL', async () => {

      const resp = { body: 'mockBody', status: 200, headers: {} };
      httpHandler.handle = jest.fn().mockReturnValueOnce(of(resp));

      const body = `grant_type=authorization_code&code=${code}&client_id=static_client&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
      const testContext = { ...context, request: { ...context.request, body } };
      await expect(handler.handle(testContext).toPromise()).resolves.toEqual(resp);

    });

    it('should error when no data was found in the store', async () => {

      store.delete(client_id);
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No data was found in the store');

    });

    it('should use the redirect_uri as key for the store if a public webid is used', async () => {

      const public_store: KeyValueStore<string, Partial<OidcClientMetadata & OidcClientRegistrationResponse>>
      = new InMemoryStore();

      const handler2
      = new ClientIdDynamicTokenHandler(public_store, httpHandler);

      public_store.set(redirect_uri, registerInfo);

      const registeredInfo = public_store.get(redirect_uri);

      public_store.get = jest.fn().mockReturnValueOnce(registeredInfo);

      await handler2
        .handle({ ...context, request: { ...context.request, body:  requestBodyWithPublicId } })
        .toPromise();

      expect(public_store.get).toHaveBeenCalledWith(redirect_uri);

    });

    it('should replace the client_id with the registered one & change the content length', async () => {

      const length = recalculateContentLength(newContext.request);
      await handler.handle(context).toPromise();

      expect(httpHandler.handle).toHaveBeenCalledWith({ ...newContext, request: { ...newContext.request, headers: { 'content-length': length, 'content-type': 'application/json;charset=utf-8' } } });

    });

    it('should error when the provided charset is not supported', async () => {

      await expect(handler.handle({ ...context, request: { ...context.request, headers: { 'content-type': 'application/json;charset=123' } } }).toPromise()).rejects.toThrow('The specified charset is not supported');

    });

    it('should swap the client id in the access_token with the client_id given in the request', async () => {

      const responseGotten = await handler.handle(context).toPromise();

      expect(responseGotten.body.access_token.payload.client_id).toEqual(client_id);
      expect(responseGotten.status).toEqual(200);

    });

    it('should error when the response does not contain an access_token', async () => {

      const resp = { body: {}, headers: {}, status: 200 };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(resp));

      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('response body did not contain an access_token');

    });

    it('should error when the response body access_token does not contain a payload', async () => {

      const resp = { body: { access_token: 'mockToken' }, headers: {}, status: 200 };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(resp));

      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('Access token in response body did not contain a decoded payload');

    });

  });

  describe('canHandle', () => {

    it('should return true if correct context was provided', async () => {

      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(true);

    });

    it('should return false if no context was provided', async () => {

      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);

      await expect(handler.canHandle(undefined).toPromise())
        .resolves.toEqual(false);

    });

    it('should return false if no request was provided', async () => {

      await expect(handler.canHandle({ ...context, request: null })
        .toPromise()).resolves.toEqual(false);

      await expect(handler.canHandle({ ...context, request: undefined })
        .toPromise()).resolves.toEqual(false);

    });

    it('should return false if no request body was provided', async () => {

      await expect(handler
        .canHandle({ ...context, request: { ...context.request, body: null } })
        .toPromise()).resolves.toEqual(false);

      await expect(handler
        .canHandle({ ...context, request: { ...context.request, body: undefined } })
        .toPromise()).resolves.toEqual(false);

    });

  });

});
