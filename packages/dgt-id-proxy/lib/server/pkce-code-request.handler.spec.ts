import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { Code, ChallengeAndMethod } from './pkce-auth-request.handler';
import { PkceCodeRequestHandler } from './pkce-code-request.handler';

describe('PkceCodeRequestHandler', () => {
  let pkceCodeRequestHandler: PkceCodeRequestHandler;
  let httpHandler: HttpHandler;
  let inMemoryStore: InMemoryStore<Code, ChallengeAndMethod>;
  let context: HttpHandlerContext;
  let response: HttpHandlerResponse;

  const challengeAndMethod = {
    challenge: 'code_challenge_value',
    method: 'S256',
  };

  const client_id = encodeURI('http://solidpod.com/jaspervandenberghen/profile/card#me');
  const referer = 'client.example.com';
  const redirect_uri = encodeURI(`http://${referer}/requests.html`);
  const state = '9c59c72b-c282-4370-bfae-33f3f5dfb42e';
  const code = 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET';
  const url =  new URL(`http://${referer}/auth?response_type=code&scope=openid&client_id=${client_id}&redirect_uri=${redirect_uri}&state=9c59c72b-c282-4370-bfae-33f3f5dfb42e`);

  beforeEach(async () => {
    response = {
      body: '',
      headers: {
        location: `http://${referer}/requests.html?code=${code}&state=${state}`,
      },
      status: 302,
    };

    httpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValueOnce(of(response)),
      safeHandle: jest.fn(),
    };

    inMemoryStore = new InMemoryStore();
    inMemoryStore.set(state, challengeAndMethod);

    context = { request: { headers: {}, body: {}, method: 'POST', url } };

    pkceCodeRequestHandler = new PkceCodeRequestHandler(httpHandler, inMemoryStore);

  });

  it('should be correctly instantiated if all deps are provided', () => {
    expect(pkceCodeRequestHandler).toBeTruthy();
  });

  it('should error when no handler or memory store was provided', () => {
    expect(() => new PkceCodeRequestHandler(undefined, inMemoryStore)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceCodeRequestHandler(null, inMemoryStore)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceCodeRequestHandler(httpHandler, undefined)).toThrow('An InMemoryStore must be provided');
    expect(() => new PkceCodeRequestHandler(httpHandler, null)).toThrow('An InMemoryStore must be provided');
  });

  describe('handle', () => {
    it('should error when no context was provided', async () => {
      await expect(() => pkceCodeRequestHandler.handle(undefined).toPromise()).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => pkceCodeRequestHandler.handle(null).toPromise()).rejects.toThrow('Context cannot be null or undefined');
    });

    it('should error when no context request is provided', async () => {
      context.request = null;
      await expect(() => pkceCodeRequestHandler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
      context.request = undefined;
      await expect(() => pkceCodeRequestHandler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
    });

    it('should error when no context request url is provided', async () => {
      context.request.url = null;
      await expect(() => pkceCodeRequestHandler.handle(context).toPromise()).rejects.toThrow('No url was included in the request');
      context.request.url= undefined;
      await expect(() => pkceCodeRequestHandler.handle(context).toPromise()).rejects.toThrow('No url was included in the request');
    });

    it('should call the httpHandler with the context', async () => {
      await pkceCodeRequestHandler.handle(context).toPromise();
      expect(httpHandler.handle).toHaveBeenCalledTimes(1);
      expect(httpHandler.handle).toHaveBeenCalledWith(context);
    });

    it('should remove state from the url if no state is included in the store', async () => {
      const responseGotten = await pkceCodeRequestHandler.handle(context).toPromise();
      expect(responseGotten).toEqual({ 'body': '', 'headers': { 'location': `http://${referer}/requests.html?code=${code}` }, 'status': 302 });
    });

    it('should switch the state key with the code in the store', async () => {
      await pkceCodeRequestHandler.handle(context).toPromise();
      await expect(inMemoryStore.get(code).then((data) => data)).resolves.toEqual(challengeAndMethod);
    });

    it('should error when no data was found in the store', async () => {
      inMemoryStore.delete(state);
      await expect(pkceCodeRequestHandler.handle(context).toPromise()).rejects.toThrow('No data was found in the store');
    });

    // it('should return the response if location header starts with a /', async () => {
    //   context.request.url =  new URL(`http://${referer}/auth/123456`);
    //   const responseGotten = await pkceCodeRequestHandler.handle(context).toPromise();
    //   console.log(responseGotten);
    //   await expect(pkceCodeRequestHandler.handle(context).toPromise()).resolves.toEqual(responseGotten);
    // });
  });

  describe('canHandle', () => {
    it('should return false if context is null or undefined', async () => {
      await expect(pkceCodeRequestHandler.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(pkceCodeRequestHandler.canHandle(undefined).toPromise()).resolves.toEqual(false);
    });

    it('should return false if context.request is null or undefined', async () => {
      context.request = null;
      await expect(pkceCodeRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request = undefined;
      await expect(pkceCodeRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return false if context.request.url is null or undefined', async () => {
      context.request.url = null;
      await expect(pkceCodeRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request.url = undefined;
      await expect(pkceCodeRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
    });
  });

});
