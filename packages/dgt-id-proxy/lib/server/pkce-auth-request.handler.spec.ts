import { of } from 'rxjs';
import { HttpHandler, HttpHandlerContext, HttpHandlerRequest, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';
import { PkceAuthRequestHandler } from './pkce-auth-request.handler';

describe('PkceAuthRequestHandler', () => {
  let pkceHandler: PkceAuthRequestHandler;
  let nestedHttpHandler: HttpHandler;
  let inMemoryStore: InMemoryStore<string,  { challenge: string; method: string }>;
  let context: HttpHandlerContext;
  let res: HttpHandlerResponse;
  let url: URL;

  beforeEach(async () => {
    res = {
      body: {},
      headers: { location: 'http://localhost:3001/requests.html?code=yoEp04ySUmJ3BrI9qWlArQle7ej4D-FRYTUE9N8wCAa' },
      status: 200,
    };
    nestedHttpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValue(of(res)),
      safeHandle: jest.fn(),
    } as HttpHandler;
    inMemoryStore = new InMemoryStore();
    url = new URL('http://localhost:3000/auth?response_type=code&code_challenge=F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ&code_challenge_method=S256&scope=openid&client_id=http%3A%2F%2Flocalhost:3002%2Fjaspervandenberghen%2Fprofile%2Fcard%23me&redirect_uri=http%3A%2F%2Flocalhost:3001%2Frequests.html');
    context = { request: { headers: {
      host: 'localhost:3003',
      connection: 'keep-alive',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'sec-gpc': '1',
      'sec-fetch-site': 'same-site',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-dest': 'document',
      referer: 'http://localhost:3001/',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'en-US,en;q=0.9',
    }, method: 'GET'
    , url } };
    pkceHandler = new PkceAuthRequestHandler(nestedHttpHandler, inMemoryStore);
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
      const noChallengeContext = context;
      noChallengeContext.request.url = new URL('http://localhost:3000/auth?response_type=code&code_challenge=&code_challenge_method=S256&scope=openid&client_id=http%3A%2F%2Flocalhost:3002%2Fjaspervandenberghen%2Fprofile%2Fcard%23me&redirect_uri=http%3A%2F%2Flocalhost:3001%2Frequests.html');
      const response =  {
        body: JSON.stringify({ error: 'invalid_request', error_description: 'A code challenge must be provided.' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      };
      await expect(pkceHandler.handle(noChallengeContext).toPromise()).resolves.toEqual(response);
      noChallengeContext.request.url = new URL('http://localhost:3000/auth?response_type=code&code_challenge_method=S256&scope=openid&client_id=http%3A%2F%2Flocalhost:3002%2Fjaspervandenberghen%2Fprofile%2Fcard%23me&redirect_uri=http%3A%2F%2Flocalhost:3001%2Frequests.html');
      await expect(pkceHandler.handle(noChallengeContext).toPromise()).resolves.toEqual(response);
    });

    it('should error when no code_challenge_method was provided', async () => {
      const noChallengeContext = context;
      noChallengeContext.request.url = new URL('http://localhost:3000/auth?response_type=code&code_challenge=F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ&code_challenge_method=&scope=openid&client_id=http%3A%2F%2Flocalhost:3002%2Fjaspervandenberghen%2Fprofile%2Fcard%23me&redirect_uri=http%3A%2F%2Flocalhost:3001%2Frequests.html');
      const response =  {
        body: JSON.stringify({ error: 'invalid_request', error_description: 'A code challenge method must be provided' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      };
      await expect(pkceHandler.handle(noChallengeContext).toPromise()).resolves.toEqual(response);
      noChallengeContext.request.url = new URL('http://localhost:3000/auth?response_type=code&code_challenge=F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ&scope=openid&client_id=http%3A%2F%2Flocalhost:3002%2Fjaspervandenberghen%2Fprofile%2Fcard%23me&redirect_uri=http%3A%2F%2Flocalhost:3001%2Frequests.html');
      await expect(pkceHandler.handle(noChallengeContext).toPromise()).resolves.toEqual(response);
    });

    it('should call the nestedHttpHandler handle method', async () => {
      await pkceHandler.handle(context).toPromise();
      expect(nestedHttpHandler.handle).toHaveBeenCalledTimes(1);
    });

    it('should error when no code was provided in the response', async () => {
      const badRes = {
        body: {},
        headers: { location: 'http://localhost:3001/requests.html' },
        status: 200,
      };
      const badHttpHandler = {
        canHandle: jest.fn(),
        handle: jest.fn().mockReturnValue(of(badRes)),
        safeHandle: jest.fn(),
      } as HttpHandler;
      const pkceHandler2 = new PkceAuthRequestHandler(badHttpHandler, inMemoryStore);
      await expect(pkceHandler2.handle(context).toPromise()).rejects.toThrow('No code was received');
    });

    it('should link the code & challenge + method in the inMemoryStore', async () => {
      await pkceHandler.handle(context).toPromise();
      const params = res.headers.location
        .split('?')[1]
        .split('=');
      const code = params[1];
      const challengeAndMethod = {
        challenge: 'F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ',
        method: 'S256',
      };
      await expect(inMemoryStore.get(code).then((data) => data)).resolves.toEqual(challengeAndMethod);
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
