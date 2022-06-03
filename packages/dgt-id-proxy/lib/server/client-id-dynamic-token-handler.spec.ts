import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of, lastValueFrom } from 'rxjs';
import { KeyValueStore } from '@digita-ai/handlersjs-storage';
import { InMemoryStore } from '../storage/in-memory-store';
import { OidcClientMetadata } from '../util/oidc-client-metadata';
import { recalculateContentLength } from '../util/recalculate-content-length';
import { OidcClientRegistrationResponse } from '../util/oidc-client-registration-response';
import { RegistrationStore } from '../util/process-client-registration-data';
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
  const requestBodyWithPublicIdRefreshToken = `grant_type=refresh_token&refresh_token=refreshTokenMock&client_id=${encodeURIComponent(public_id)}`;
  const swappedBody = `grant_type=authorization_code&code=${code}&client_id=jnO4LverDPv4AP2EghUSG&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const noClientIDRequestBody = `grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}&code_verifier=${code_verifier}`;
  const noRedirectURIRequestBody = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(client_id)}&code_verifier=${code_verifier}`;
  const noRefreshTokenRequestBody = `grant_type=refresh_token&code=${code}&client_id=${encodeURIComponent(client_id)}&code_verifier=${code_verifier}`;
  const requestBodyWithIncorrectGrantType = `grant_type=implicit&code=${code}&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
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

  const store: RegistrationStore = new InMemoryStore();

  let handler: ClientIdDynamicTokenHandler;

  const registerInfo = {
    application_type: 'web',
    grant_types: [ 'authorization_code' ],
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
      handle: jest.fn().mockReturnValue(of(response)),
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

      await expect(() => lastValueFrom(handler.handle(undefined))).rejects.toThrow('A context must be provided');
      await expect(() => lastValueFrom(handler.handle(null))).rejects.toThrow('A context must be provided');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: null }))).rejects.toThrow('No request was included in the context');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: undefined }))).rejects.toThrow('No request was included in the context');

    });

    it('should error when no request body is provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, body: null } }))).rejects.toThrow('No body was included in the request');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, body: undefined } }))).rejects.toThrow('No body was included in the request');

    });

    it('should error when no client_id was provided', async () => {

      const noClientIdContext = { ... context, request: { ...context.request, body:  noClientIDRequestBody } };
      await expect(() => lastValueFrom(handler.handle(noClientIdContext))).rejects.toThrow('Request must contain a client_id claim');

    });

    it('should error when no client_id was provided and authorization header is not basic', async () => {

      const noClientIdContext = { ... context, request: { ...context.request, body:  noClientIDRequestBody, headers: { 'Authorization': 'dGVzdA==' } } };
      await expect(() => lastValueFrom(handler.handle(noClientIdContext))).rejects.toThrow('Request must contain a client_id claim');

    });

    it('should error when no client_id was provided and authorization header does not contain a client_id claim', async () => {

      const noClientIdContext = { ... context, request: { ...context.request, body:  noClientIDRequestBody, headers: { 'Authorization': 'Basic dGVzdA==' } } };
      await expect(() => lastValueFrom(handler.handle(noClientIdContext))).rejects.toThrow('Request must contain a client_id claim');

    });

    it('should error when grant_type is not refresh_token or authorization_code', async () => {

      const testContext = { ... context, request: { ...context.request, body: requestBodyWithIncorrectGrantType } };
      await expect(() => lastValueFrom(handler.handle(testContext))).rejects.toThrow('grant_type must be either "authorization_code" or "refresh_token"');

    });

    it('should error when no redirect_uri was provided when grant_type is authorization_code', async () => {

      const noRedirectURIContext = { ... context, request: { ...context.request, body:  noRedirectURIRequestBody } };
      await expect(() => lastValueFrom(handler.handle(noRedirectURIContext))).rejects.toThrow('No redirect_uri was provided');

    });

    it('should error when no refresh_token was provided and grant type is refresh_token', async () => {

      const noRefreshTokenContext = { ... context, request: { ...context.request, body:  noRefreshTokenRequestBody } };
      await expect(() => lastValueFrom(handler.handle(noRefreshTokenContext))).rejects.toThrow('No refresh_token was provided');

    });

    it('should pass the request on to the nested handler if the client_id is not a valid URL', async () => {

      const resp = { body: 'mockBody', status: 200, headers: {} };
      httpHandler.handle = jest.fn().mockReturnValueOnce(of(resp));

      const body = `grant_type=authorization_code&code=${code}&client_id=static_client&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
      const testContext = { ...context, request: { ...context.request, body } };
      await expect(lastValueFrom(handler.handle(testContext))).resolves.toEqual(resp);

    });

    it('should error when no data was found in the store', async () => {

      store.delete(client_id);
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No data was found in the store');

    });

    it('should use the redirect_uri as key for the store if a public webid is used and grant_type is authorization_code', async () => {

      const public_store: KeyValueStore<string, OidcClientMetadata & OidcClientRegistrationResponse>
      = new InMemoryStore();

      const handler2
      = new ClientIdDynamicTokenHandler(public_store, httpHandler);

      public_store.set(redirect_uri, registerInfo);

      const registeredInfo = await public_store.get(redirect_uri);

      public_store.get = jest.fn().mockResolvedValueOnce(registeredInfo);

      await lastValueFrom(handler2
        .handle({ ...context, request: { ...context.request, body:  requestBodyWithPublicId } }));

      expect(public_store.get).toHaveBeenCalledWith(redirect_uri);

    });

    it('should get the registration info from the store using the refresh_token when grant_type is refresh_token', async () => {

      const public_store: KeyValueStore<string, OidcClientMetadata & OidcClientRegistrationResponse>
      = new InMemoryStore();

      const handler2
      = new ClientIdDynamicTokenHandler(public_store, httpHandler);

      public_store.set('refreshTokenMock', registerInfo);

      public_store.get = jest.fn().mockResolvedValueOnce(registerInfo);

      await lastValueFrom(handler2
        .handle({ ...context, request: { ...context.request, body:  requestBodyWithPublicIdRefreshToken } }));

      expect(public_store.get).toHaveBeenCalledTimes(1);
      expect(public_store.get).toHaveBeenCalledWith('refreshTokenMock');

    });

    it('should replace the client_id with the registered one & change the content length', async () => {

      const length = recalculateContentLength(newContext.request);
      await lastValueFrom(handler.handle(context));

      expect(httpHandler.handle).toHaveBeenCalledWith({ ...newContext, request: { ...newContext.request, headers: { 'content-length': length, 'content-type': 'application/json;charset=utf-8' } } });

    });

    it('should replace the client_id with the registered one & change the content length', async () => {

      const length = recalculateContentLength(newContext.request);
      await lastValueFrom(handler.handle(context));

      expect(httpHandler.handle).toHaveBeenCalledWith({ ...newContext, request: { ...newContext.request, headers: { 'content-length': length, 'content-type': 'application/json;charset=utf-8' } } });

    });

    it('should error when the provided charset is not supported', async () => {

      await expect(lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: { 'content-type': 'application/json;charset=123' } } }))).rejects.toThrow('The specified charset is not supported');

    });

    it('should swap the client id in the access_token with the client_id given in the request', async () => {

      const responseGotten = await lastValueFrom(handler.handle(context));

      expect(responseGotten.body.access_token.payload.client_id).toEqual(client_id);
      expect(responseGotten.status).toEqual(200);

    });

    it('should error when the response does not contain an access_token', async () => {

      const resp = { body: {}, headers: {}, status: 200 };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(resp));

      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('response body did not contain an access_token');

    });

    it('should error when the response body access_token does not contain a payload', async () => {

      const resp = { body: { access_token: 'mockToken' }, headers: {}, status: 200 };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(resp));

      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('Access token in response body did not contain a decoded payload');

    });

    it('should pass the upstream error in an error response when needed and set status to 400', async () => {

      const resp = { body: JSON.stringify({ error: 'invalid_request' }), headers: { 'upstream': 'errorHeader' }, status: 401 };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(resp));

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({ body: '{"error":"invalid_request"}', headers: { 'upstream': 'errorHeader' }, status: 400 });

    });

    it('should replace the refresh_token from the upstream when it is present in the response with the redirect_uri in the store as key when client is public and grant_type is authorization', async () => {

      const testResponse = { ... response, body: { ...response.body, refresh_token: 'refreshTokenMock' } };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(testResponse));

      const public_store: KeyValueStore<string, OidcClientMetadata & OidcClientRegistrationResponse>
      = new InMemoryStore();

      const handler2
      = new ClientIdDynamicTokenHandler(public_store, httpHandler);

      public_store.set(redirect_uri, registerInfo);

      const registeredInfo = await public_store.get(redirect_uri);

      public_store.set = jest.fn().mockReturnValue({});

      public_store.delete = jest.fn().mockReturnValue({});

      await lastValueFrom(handler2
        .handle({ ...context, request: { ...context.request, body:  requestBodyWithPublicId } }));

      expect(public_store.delete).toHaveBeenCalledWith(redirect_uri);
      expect(public_store.set).toHaveBeenCalledWith('refreshTokenMock', registeredInfo);

    });

    // The store should always have registration info, otherwise it would error much earlier. However, typescript doesn't know that,
    // so we have to check again.
    it('should not replace the refresh_token from the upstream when there is no registration info in the store', async () => {

      const testResponse = { ... response, body: { ...response.body, refresh_token: 'refreshTokenMock' } };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(testResponse));

      const public_store: KeyValueStore<string, OidcClientMetadata & OidcClientRegistrationResponse>
      = new InMemoryStore();

      const handler2
      = new ClientIdDynamicTokenHandler(public_store, httpHandler);

      public_store.set(redirect_uri, registerInfo);

      let count = 0;

      public_store.get = jest.fn(async (item) => {

        if (count === 1) return undefined;

        count++;

        return registerInfo;

      });

      public_store.set = jest.fn().mockReturnValue({});

      public_store.delete = jest.fn().mockReturnValue({});

      await lastValueFrom(handler2
        .handle({ ...context, request: { ...context.request, body:  requestBodyWithPublicId } }));

      expect(public_store.delete).toHaveBeenCalledTimes(0);
      expect(public_store.set).toHaveBeenCalledTimes(0);

    });

    it('should call the store with the client_id provided in the authorization header if present', async () => {

      store.set('http://client_id/profile/card#me', registerInfo);

      const registeredInfo = await store.get('http://client_id/profile/card#me');

      store.get = jest.fn().mockResolvedValueOnce(registeredInfo);

      const noClientIdContext = { ... context, request: { ...context.request, body:  noClientIDRequestBody, headers: { 'Authorization': 'Basic aHR0cDovL2NsaWVudF9pZC9wcm9maWxlL2NhcmQjbWU6Y2xpZW50X3NlY3JldA==' } } };

      await lastValueFrom(handler.handle(noClientIdContext));

      expect(store.get).toHaveBeenCalledWith('http://client_id/profile/card#me');

    });

  });

  describe('canHandle', () => {

    it('should return true if correct context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(true);

    });

    it('should return false if no context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(null))).resolves.toEqual(false);

      await expect(lastValueFrom(handler.canHandle(undefined)))
        .resolves.toEqual(false);

    });

    it('should return false if no request was provided', async () => {

      await expect(lastValueFrom(handler.canHandle({ ...context, request: null }))).resolves.toEqual(false);

      await expect(lastValueFrom(handler.canHandle({ ...context, request: undefined }))).resolves.toEqual(false);

    });

    it('should return false if no request body was provided', async () => {

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, body: null } }))).resolves.toEqual(false);

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, body: undefined } }))).resolves.toEqual(false);

    });

  });

});
