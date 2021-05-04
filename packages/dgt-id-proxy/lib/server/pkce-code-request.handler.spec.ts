import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';
import { PkceCodeRequestHandler } from './pkce-code-request.handler';

describe('PkceCodeRequestHandler', () => {
  let pkceCodeRequestHandler: PkceCodeRequestHandler;
  let httpHandler: HttpHandler;
  let store: InMemoryStore<Code, ChallengeAndMethod>;
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

  const challengeAndMethodAndState = {
    challenge: 'code_challenge_value',
    method: 'S256',
    state,
  };

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

    store = new InMemoryStore();
    store.set(state, challengeAndMethod);

    context = { request: { headers: {}, body: {}, method: 'POST', url } };

    pkceCodeRequestHandler = new PkceCodeRequestHandler(httpHandler, store);

  });

  it('should be correctly instantiated if all deps are provided', () => {
    expect(pkceCodeRequestHandler).toBeTruthy();
  });

  it('should error when no handler or memory store was provided', () => {
    expect(() => new PkceCodeRequestHandler(undefined, store)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceCodeRequestHandler(null, store)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceCodeRequestHandler(httpHandler, undefined)).toThrow('A store must be provided');
    expect(() => new PkceCodeRequestHandler(httpHandler, null)).toThrow('A store must be provided');
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

    it('should remove state from the url if no state is included in the store and set the body empty', async () => {
      const responseGotten = await pkceCodeRequestHandler.handle(context).toPromise();
      expect(responseGotten).toEqual({ 'body': '', 'headers': { 'location': `http://${referer}/requests.html?code=${code}` }, 'status': 302 });
    });

    it('should set the headers location to a URL without state if no state is included in the store', async () => {
      const responseGotten = await pkceCodeRequestHandler.handle(context).toPromise();
      expect(responseGotten.headers.location).toEqual(`http://${referer}/requests.html?code=${code}`);
    });

    it('should delete the inMemory data with the state as key from the store if no state was included in the value', async () => {
      await pkceCodeRequestHandler.handle(context).toPromise();
      expect(store.get(state).then((data) => data)).resolves.toBeUndefined();
    });

    it('should delete the inMemory data with the state as key from the store if no state was included in the value', async () => {
      store.delete(state);
      store.set(state, challengeAndMethodAndState);
      await pkceCodeRequestHandler.handle(context).toPromise();
      expect(store.get(state).then((data) => data)).resolves.toBeUndefined();
    });

    it('should switch the state key with the code in the store', async () => {
      await pkceCodeRequestHandler.handle(context).toPromise();
      await expect(store.get(code).then((data) => data)).resolves.toEqual(challengeAndMethod);
    });

    it('should error when no data was found in the store', async () => {
      store.delete(state);
      await expect(pkceCodeRequestHandler.handle(context).toPromise()).rejects.toThrow('No data was found in the store');
    });

    it('should error if no state in the location', async () => {
      response.headers.location = `http://${referer}/requests.html?code=${code}`;
      await expect(pkceCodeRequestHandler.handle(context).toPromise()).rejects.toThrow('No data was found in the store');
    });

    it('should error when no code was included in the response', async () => {
      response.headers.location = `http://${referer}/requests.html?state=${state}`;
      await expect(pkceCodeRequestHandler.handle(context).toPromise()).rejects.toThrow('No code was included in the response');
    });

    it('should return the response if its a dynamic auth request', async () => {
      response.headers.location = '/auth/123456';
      httpHandler.handle = jest.fn().mockReturnValueOnce(of(response));
      await expect(pkceCodeRequestHandler.handle(context).toPromise()).resolves.toEqual(response);
    });
  });

  describe('canHandle', () => {
    it('should return true if context is complete', async () => {
      await expect(pkceCodeRequestHandler.canHandle(context).toPromise()).resolves.toEqual(true);
    });

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
