import { of } from 'rxjs';
import { HttpHandler, HttpHandlerContext, HttpHandlerRequest, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';
import { Code, ChallengeAndMethod, PkceAuthRequestHandler } from './pkce-auth-request.handler';

describe('PkceAuthRequestHandler', () => {
  let pkceHandler: PkceAuthRequestHandler;
  let nestedHttpHandler: HttpHandler;
  let response: HttpHandlerResponse;
  let context: HttpHandlerContext;
  const inMemoryStore = new InMemoryStore<Code, ChallengeAndMethod>();
  const code_challenge_value = 'F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ';
  const code_challenge_method_value = 'S256';
  const challengeAndMethod = {
    challenge: code_challenge_value,
    method: code_challenge_method_value,
  };
  const client_id = 'http%3A%2F%2Fsolidpod.%2Fjaspervandenberghen%2Fprofile%2Fcard%23me';
  const redirect_uri = 'http%3A%2F%2Fclient.example.com%2Frequests.html';
  const endpoint = 'auth';
  const code = 'yoEp04ySUmJ3BrI9qWlArQle7ej4D-FRYTUE9N8wCAa';
  const referer = 'client.example.com';
  const host = 'server.example.com';
  const redirectWithAuth = `http://${referer}/redirect_callback.html?code=${code}`;
  let url: URL;

  beforeEach(async () => {

    nestedHttpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValue(of({
        body: {},
        headers: { location: redirectWithAuth },
        status: 302,
      } as HttpHandlerResponse)),
      safeHandle: jest.fn(),
    } as HttpHandler;

    context = { request: { headers: { host, referer }, method: 'GET', url } };
    url = new URL(`http://${host}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${client_id}&redirect_uri=${redirect_uri}`);

    pkceHandler = new PkceAuthRequestHandler(nestedHttpHandler, inMemoryStore);

    response =  {
      body: '',
      headers: { 'access-control-allow-origin': context.request.headers.origin },
      status: 400,
    };
  });

  it('should be correctly instantiated if all deps are provided', () => {
    expect(pkceHandler).toBeTruthy();
  });

  it('should error when no handler or memory store was provided', () => {
    expect(() => new PkceAuthRequestHandler(undefined, inMemoryStore)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceAuthRequestHandler(null, inMemoryStore)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceAuthRequestHandler(nestedHttpHandler, undefined)).toThrow('An InMemoryStore must be provided');
    expect(() => new PkceAuthRequestHandler(nestedHttpHandler, null)).toThrow('An InMemoryStore must be provided');
  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {
      await expect(() => pkceHandler.handle(undefined).toPromise()).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => pkceHandler.handle(null).toPromise()).rejects.toThrow('Context cannot be null or undefined');
    });

    it('should error when no context request is provided', async () => {
      context.request = null;
      await expect(() => pkceHandler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
      context.request = undefined;
      await expect(() => pkceHandler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
    });

    it('should error when no context request url is provided', async () => {
      context.request.url = null;
      await expect(() => pkceHandler.handle(context).toPromise()).rejects.toThrow('No url was included in the request');
      context.request.url= undefined;
      await expect(() => pkceHandler.handle(context).toPromise()).rejects.toThrow('No url was included in the request');
    });

    it('should error when no code_challenge was provided', async () => {
      context.request.url.searchParams.set('code_challenge', '');
      response.body = JSON.stringify({ error: 'invalid_request', error_description: 'A code challenge must be provided.' });
      await expect(pkceHandler.handle(context).toPromise()).resolves.toEqual(response);
      context.request.url.searchParams.delete('code_challenge');
      await expect(pkceHandler.handle(context).toPromise()).resolves.toEqual(response);
    });

    it('should error when no code_challenge_method was provided', async () => {
      context.request.url.searchParams.set('code_challenge_method', '');
      response.body = JSON.stringify({ error: 'invalid_request', error_description: 'A code challenge method must be provided' });
      await expect(pkceHandler.handle(context).toPromise()).resolves.toEqual(response);
      context.request.url.searchParams.delete('code_challenge_method');
      await expect(pkceHandler.handle(context).toPromise()).resolves.toEqual(response);
    });

    it('should call the nestedHttpHandler handle method with the context', async () => {
      await pkceHandler.handle(context).toPromise();
      expect(nestedHttpHandler.handle).toHaveBeenCalledTimes(1);
      expect(nestedHttpHandler.handle).toHaveBeenCalledWith(context);
    });

    it('should error when no authorization code was provided in the response', async () => {
      const badRes = {
        body: {},
        headers: { location: `${referer}/requests.html` },
        status: 400,
      };

      const badHttpHandler = {
        canHandle: jest.fn(),
        handle: jest.fn().mockReturnValue(of(badRes)),
        safeHandle: jest.fn(),
      } as HttpHandler;

      const pkceHandler2 = new PkceAuthRequestHandler(badHttpHandler, inMemoryStore);
      await expect(pkceHandler2.handle(context).toPromise()).resolves.toEqual(badRes);
    });

    it('should link the authorization code & challenge + method in the inMemoryStore', async () => {
      await pkceHandler.handle(context).toPromise();
      const authCode = redirectWithAuth
        .split('?')[1]
        .split('=')[1];
      await expect(inMemoryStore.get(authCode).then((data) => data)).resolves.toEqual(challengeAndMethod);
    });
  });

  describe('canHandle', () => {
    it('should return false if no context was provided', async () => {
      await expect(pkceHandler.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(pkceHandler.canHandle(undefined).toPromise()).resolves.toEqual(false);
    });

    it('should return false if no request was provided', async () => {
      context.request = undefined;
      await expect(pkceHandler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request = null;
      await expect(pkceHandler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return true if correct context was provided', async () => {
      await expect(pkceHandler.canHandle(context).toPromise()).resolves.toEqual(true);
    });
  });

});
