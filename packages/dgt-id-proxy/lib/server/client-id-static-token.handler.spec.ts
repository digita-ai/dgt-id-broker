import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import fetchMock from 'jest-fetch-mock';
import { recalculateContentLength } from '../util/recalculate-content-length';
import { ClientIdStaticTokenHandler } from './client-id-static-token.handler';

describe('ClientIdStaticTokenHandler', () => {

  beforeAll(() => fetchMock.enableMocks());

  let httpHandler: HttpHandler;

  const referer = 'http://client.example.com';
  const url =  new URL(`${referer}/token`);
  const code_verifier = 'hmWgQqnBMBeK23cGJvJko9rdIZrNfuvCsZ43uNzdMQhs3HVU6Q4yWvVji3pftn9rz3xDwcPTYgtwi2SXBrvfsrlP4xcQftpd1Yj23ocpTRMAYUU6ptqmsTCRV6Q8DtkT';
  const code = 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET';
  const redirect_uri = 'http://client.example.com/requests.html';
  const client_id = 'http://solidpod./jaspervandenberghen/profile/card#me';
  const client_id_constructor = 'static_client';
  const public_id = 'http://www.w3.org/ns/solid/terms#PublicOidcClient';
  const client_secret = 'static_secret';
  const redirect_uri_constructor = 'http://digita.ai/redirect';
  const noClientIDRequestBody = `grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}&code_verifier=${code_verifier}`;
  const noGrantTypeRequestBody = `code=${code}&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const noRedirectUriRequestBody = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(client_id)}&code_verifier=${code_verifier}`;
  const headers = { 'content-length': '302', 'content-type': 'application/json;charset=utf-8' };
  const requestBody = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const publicClientRequestBody = `grant_type=authorization_code&code=${code}&client_id=http://www.w3.org/ns/solid/terms#PublicOidcClient&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const requestBodyWithOtherGrantType = `grant_type=implicit&code=${code}&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
  const requestBodyWithStaticClient = `grant_type=authorization_code&code=${code}&client_id=${encodeURIComponent(client_id_constructor)}&redirect_uri=${encodeURIComponent(redirect_uri_constructor)}&code_verifier=${code_verifier}&client_secret=${client_secret}`;
  let context: HttpHandlerContext;

  const clientRegistrationData = {
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
  };

  let handler: ClientIdStaticTokenHandler;

  beforeEach(() => {

    httpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValue(of()),
      safeHandle: jest.fn(),
    };

    handler = new ClientIdStaticTokenHandler(
      httpHandler,
      client_id_constructor,
      client_secret,
      redirect_uri_constructor,
    );

    context = { request: { headers, body: requestBody, method: 'POST', url } };

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no handler, clientId, clientSecret or redirectUri are provided', () => {

    expect(() => new ClientIdStaticTokenHandler(undefined, client_id_constructor, client_secret, redirect_uri_constructor)).toThrow('No handler was provided');
    expect(() => new ClientIdStaticTokenHandler(null, client_id_constructor, client_secret, redirect_uri_constructor)).toThrow('No handler was provided');
    expect(() => new ClientIdStaticTokenHandler(httpHandler, undefined, client_secret, redirect_uri_constructor)).toThrow('No clientId was provided');
    expect(() => new ClientIdStaticTokenHandler(httpHandler, null, client_secret, redirect_uri_constructor)).toThrow('No clientId was provided');
    expect(() => new ClientIdStaticTokenHandler(httpHandler, client_id_constructor, undefined, redirect_uri_constructor)).toThrow('No clientSecret was provided');
    expect(() => new ClientIdStaticTokenHandler(httpHandler, client_id_constructor, null, redirect_uri_constructor)).toThrow('No clientSecret was provided');
    expect(() => new ClientIdStaticTokenHandler(httpHandler, client_id_constructor, client_secret, undefined)).toThrow('No redirectUri was provided');
    expect(() => new ClientIdStaticTokenHandler(httpHandler, client_id_constructor, client_secret, null)).toThrow('No redirectUri was provided');

  });

  it('should error when redirectUri is not a valid URI', () => {

    expect(() => new ClientIdStaticTokenHandler(httpHandler, client_id_constructor, client_secret, 'notAValidURI')).toThrow('redirectUri must be a valid URI');

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

    it('should error when no grant_type was provided', async () => {

      const noGrantTypeContext = { ... context, request: { ...context.request, body:  noGrantTypeRequestBody } };
      await expect(() => handler.handle(noGrantTypeContext).toPromise()).rejects.toThrow('No grant_type was provided');

    });

    it('should error when no redirect_uri was provided', async () => {

      const noRedirectUriContext = { ... context, request: { ...context.request, body:  noRedirectUriRequestBody } };
      await expect(() => handler.handle(noRedirectUriContext).toPromise()).rejects.toThrow('No redirect_uri was provided');

    });

    it('should pass the request on to the nested handler if the client_id is not a valid URL', async () => {

      const resp = { body: 'mockBody', status: 200, headers: {} };
      httpHandler.handle = jest.fn().mockReturnValueOnce(of(resp));

      const body = `grant_type=authorization_code&code=${code}&client_id=static_client&redirect_uri=${encodeURIComponent(redirect_uri)}&code_verifier=${code_verifier}`;
      context = { ...context, request: { ...context.request, body } };
      await expect(handler.handle(context).toPromise()).resolves.toEqual(resp);

    });

    it('should change the client_id, redirect_uri and add client_secret in the request if the client is public', async () => {

      const testContext = { ...context, request: { ...context.request, body: publicClientRequestBody } };

      await handler.handle(testContext).toPromise();

      const bodyAsSearchParams = new URLSearchParams(testContext.request.body);
      bodyAsSearchParams.set('client_id', client_id_constructor);
      bodyAsSearchParams.set('client_secret', client_secret);
      bodyAsSearchParams.set('redirect_uri', redirect_uri_constructor);

      testContext.request.body = bodyAsSearchParams.toString();

      await expect(httpHandler.handle).toHaveBeenCalledWith({
        ...testContext,
        request: {
          ...testContext.request,
          headers: { 'content-length': recalculateContentLength(testContext.request), 'content-type': 'application/json;charset=utf-8' },
        },
      });

    });

    it('should add the client_id to the access_token payload when the client is public', async () => {

      const testContext = { ...context, request: { ...context.request, body: publicClientRequestBody } };

      const response = {
        body: { access_token: { payload: { client_id: client_id_constructor } } }, status: 200, headers: {},
      };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(response));

      await expect(handler.handle(testContext)
        .toPromise()).resolves.toEqual({
        ...response, body: { access_token: { payload: { client_id: public_id } } },
      });

    });

    it('should error if the response does not contain an access_token when the client_id is public', async () => {

      const testContext = { ...context, request: { ...context.request, body: publicClientRequestBody } };

      const response = {
        body: { }, status: 200, headers: {},
      };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(response));

      await expect(() => handler.handle(testContext).toPromise()).rejects.toThrow('response body did not contain an access_token');

    });

    it('should error if the access_token in the response body does not contain a payload when the client_id is not public', async () => {

      const testContext = { ...context, request: { ...context.request, body: publicClientRequestBody } };

      const response = {
        body: { access_token: 'mockToken' }, status: 200, headers: {},
      };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(response));

      await expect(() => handler.handle(testContext).toPromise()).rejects.toThrow('Access token in response body did not contain a decoded payload');

    });

    it('should error when return type is not json', async () => {

      fetchMock.once(JSON.stringify(clientRegistrationData), { headers: { 'content-type':'text/html' }, status: 200 });

      await expect(handler.handle(context).toPromise()).rejects.toThrow(`Incorrect content-type: expected application/ld+json but got text/html`);

    });

    it('should error when the client registration data is not valid', async () => {

      fetchMock.once(JSON.stringify({ ...clientRegistrationData, '@context': undefined }), { headers: { 'content-type':'application/ld+json' }, status: 200 });

      await expect(handler.handle(context).toPromise()).rejects.toThrow(`client registration data should use the normative JSON-LD @context`);

    });

    it('should error if the grant type is not present in the pod', async () => {

      fetchMock.once(JSON.stringify(clientRegistrationData), { headers: { 'content-type':'application/ld+json' }, status: 200 });

      await expect(handler.handle({ ...context, request: { ...context.request, body: requestBodyWithOtherGrantType } }).toPromise()).rejects.toThrow('The grant type in the request is not included in the client registration data');

    });

    it('should handle the context if all data is correct', async () => {

      fetchMock.once(JSON.stringify(clientRegistrationData), { headers: { 'content-type':'application/ld+json' }, status: 200 });

      await handler.handle(context).toPromise();

      expect(httpHandler.handle).toHaveBeenCalledTimes(1);

      expect(httpHandler.handle)
        .toHaveBeenCalledWith({ ...context, request: { ...context.request, body: requestBodyWithStaticClient } });

    });

    it('should replace the client_id with the registered one, add the client_secret & change the content length', async () => {

      fetchMock.once(JSON.stringify(clientRegistrationData), { headers: { 'content-type':'application/ld+json' }, status: 200 });
      const newContext = { request: { headers, body: requestBodyWithStaticClient, method: 'POST', url } } as HttpHandlerContext;
      const length = recalculateContentLength(newContext.request);
      await handler.handle(context).toPromise();

      const bodyAsSearchParams = new URLSearchParams(newContext.request.body);

      expect(httpHandler.handle).toHaveBeenCalledWith({ ...newContext, request: { ...newContext.request, headers: { 'content-length': length, 'content-type': 'application/json;charset=utf-8' } } });
      expect(bodyAsSearchParams.get('client_id')).toEqual(client_id_constructor);
      expect(bodyAsSearchParams.get('client_secret')).toEqual(client_secret);

    });

    it('should add the client_id to the access_token payload when the client is not public', async () => {

      fetchMock.once(JSON.stringify(clientRegistrationData), { headers: { 'content-type':'application/ld+json' }, status: 200 });

      const response = {
        body: { access_token: { payload: { client_id: client_id_constructor } } }, status: 200, headers: {},
      };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(response));

      await expect(handler.handle(context)
        .toPromise()).resolves.toEqual({
        ...response, body: { access_token: { payload: { client_id } } },
      });

    });

    it('should error if the response does not contain an access_token when the client_id is not public', async () => {

      fetchMock.once(JSON.stringify(clientRegistrationData), { headers: { 'content-type':'application/ld+json' }, status: 200 });

      const response = {
        body: { }, status: 200, headers: {},
      };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(response));

      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('response body did not contain an access_token');

    });

    it('should error if the access_token in the response body does not contain a payload when the client_id is not public', async () => {

      fetchMock.once(JSON.stringify(clientRegistrationData), { headers: { 'content-type':'application/ld+json' }, status: 200 });

      const response = {
        body: { access_token: 'mockToken' }, status: 200, headers: {},
      };

      httpHandler.handle = jest.fn().mockReturnValueOnce(of(response));

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
