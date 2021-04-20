import { of } from 'rxjs';
import { HttpHandler, HttpHandlerContext, HttpHandlerRequest, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';
import { Code, ChallengeAndMethod, PkceAuthRequestHandler } from './pkce-auth-request.handler';

describe('PkceAuthRequestHandler', () => {
  let pkceHandler: PkceAuthRequestHandler;
  let nestedHttpHandler: HttpHandler;
  let inMemoryStore: InMemoryStore<Code, ChallengeAndMethod>;
  let context: HttpHandlerContext;
  let res: HttpHandlerResponse;
  let url: URL;
  let code_challenge_value: string;
  let code_challenge_method_value: string;
  let challengeAndMethod: ChallengeAndMethod;
  let client_id: string;
  let redirect_uri: string;
  let endpoint: string;
  let host_panva: string;
  let auth_code: string;
  let referer: string;
  let host: string;
  let response: HttpHandlerResponse;

  beforeEach(async () => {
    referer = 'http://client.example.com';
    host = 'localhost:3000';
    auth_code = 'yoEp04ySUmJ3BrI9qWlArQle7ej4D-FRYTUE9N8wCAa';

    res = {
      body: {},
      headers: { location: `http://${referer}/redirect_callback.html?code=${auth_code}` },
      status: 302,
    };

    nestedHttpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValue(of(res)),
      safeHandle: jest.fn(),
    } as HttpHandler;

    inMemoryStore = new InMemoryStore();

    code_challenge_value = 'F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ';
    code_challenge_method_value = 'S256';
    challengeAndMethod = {
      challenge: code_challenge_value,
      method: code_challenge_method_value,
    };
    client_id = 'http%3A%2F%2Flocalhost:3002%2Fjaspervandenberghen%2Fprofile%2Fcard%23me';
    redirect_uri = 'http%3A%2F%2Flocalhost:3001%2Frequests.html';
    endpoint = 'auth';
    host_panva = 'localhost:3000';

    url = new URL(`http://${host_panva}/${endpoint}?response_type=code&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${client_id}&redirect_uri=${redirect_uri}`);

    context = { request: { headers: {
      host,
      referer,
    }, method: 'GET'
    , url } };

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

    it('should call the nestedHttpHandler handle method', async () => {
      await pkceHandler.handle(context).toPromise();
      expect(nestedHttpHandler.handle).toHaveBeenCalledTimes(1);
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
      await expect(pkceHandler2.handle(context).toPromise()).rejects.toThrow();
    });

    it('should link the authorization code & challenge + method in the inMemoryStore', async () => {
      await pkceHandler.handle(context).toPromise();
      const params = res.headers.location
        .split('?')[1]
        .split('=');
      const authCode = params[1];
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
