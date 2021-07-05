import { of } from 'rxjs';
import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';
import { PkceAuthRequestHandler } from './pkce-auth-request.handler';

describe('PkceAuthRequestHandler', () => {

  let context: HttpHandlerContext;

  const store = new InMemoryStore<Code, ChallengeAndMethod>();
  const code_challenge_value = 'F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ';
  const code_challenge_method_value = 'S256';

  const state = '123456';

  const challengeAndMethodAndState = {
    challenge: code_challenge_value,
    method: code_challenge_method_value,
  };

  const referer = 'client.example.com';
  const client_id = encodeURI('http://solidpod.com/jaspervandenberghen/profile/card#me');
  const redirect_uri = encodeURI(`http://${referer}/requests.html`);
  const endpoint = 'auth';
  const code = 'yoEp04ySUmJ3BrI9qWlArQle7ej4D-FRYTUE9N8wCAa';
  const host = 'server.example.com';
  const redirectWithAuth = `/redirect_callback.html?code=${code}`;
  let url: URL;

  const nestedHttpHandler = {
    canHandle: jest.fn(),
    handle: jest.fn().mockReturnValue(of({
      body: {},
      headers: { location: redirectWithAuth },
      status: 302,
    })),
    safeHandle: jest.fn(),
  };

  const response =  {
    body: '',
    headers: {},
    status: 400,
  };

  let pkceHandler: PkceAuthRequestHandler;

  beforeEach(async () => {

    context = { request: { headers: { host, referer }, method: 'GET', url } };
    url = new URL(`http://${host}/${endpoint}?response_type=code&state=${state}&code_challenge=${code_challenge_value}&code_challenge_method=${code_challenge_method_value}&scope=openid&client_id=${client_id}&redirect_uri=${redirect_uri}`);
    pkceHandler = new PkceAuthRequestHandler(nestedHttpHandler, store);

  });

  it('should be correctly instantiated if all deps are provided', () => {

    expect(pkceHandler).toBeTruthy();

  });

  it('should error when no handler or memory store was provided', () => {

    expect(() => new PkceAuthRequestHandler(undefined, store)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceAuthRequestHandler(null, store)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceAuthRequestHandler(nestedHttpHandler, undefined)).toThrow('A store must be provided');
    expect(() => new PkceAuthRequestHandler(nestedHttpHandler, null)).toThrow('A store must be provided');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => pkceHandler.handle(undefined).toPromise()).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => pkceHandler.handle(null).toPromise()).rejects.toThrow('Context cannot be null or undefined');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => pkceHandler.handle({ ... context, request: null }).toPromise()).rejects.toThrow('No request was included in the context');
      await expect(() => pkceHandler.handle({ ... context, request: undefined }).toPromise()).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request url is provided', async () => {

      await expect(() => pkceHandler.handle({ ... context, request: { ...context.request, url: null } }).toPromise()).rejects.toThrow('No url was included in the request');
      await expect(() => pkceHandler.handle({ ... context, request: { ...context.request, url: undefined } }).toPromise()).rejects.toThrow('No url was included in the request');

    });

    it('should error when no state is provided in the request', async () => {

      const noStateURL = new URL(url.href);
      noStateURL.searchParams.set('state', '');
      const emptyStateContext = { ... context, request: { ...context.request, url: noStateURL } };

      await expect(() => pkceHandler.handle(emptyStateContext).toPromise())
        .rejects.toThrow('Request must contain a state. Add state handlers to the proxy.');

      noStateURL.searchParams.delete('state');
      const noStateContext = { ... context, request: { ...context.request, url: noStateURL } };

      await expect(() => pkceHandler.handle(noStateContext).toPromise())
        .rejects.toThrow('Request must contain a state. Add state handlers to the proxy.');

    });

    it('should error when no code_challenge was provided', async () => {

      const noChallengeURL = new URL(url.href);
      noChallengeURL.searchParams.set('code_challenge', '');

      const responseBody = JSON.stringify({ error: 'invalid_request', error_description: 'A code challenge must be provided.' });
      const noChallengeContext = { ... context, request: { ...context.request, url: noChallengeURL } };

      await expect(pkceHandler.handle(noChallengeContext).toPromise())
        .resolves.toEqual({ ...response, body: responseBody });

      noChallengeURL.searchParams.delete('code_challenge');

      await expect(pkceHandler.handle(noChallengeContext).toPromise())
        .resolves.toEqual({ ...response, body: responseBody });

    });

    it('should error when no code_challenge_method was provided', async () => {

      const noMethodURL = new URL(url.href);
      noMethodURL.searchParams.set('code_challenge_method', '');

      const responseBody = JSON.stringify({ error: 'invalid_request', error_description: 'A code challenge method must be provided' });
      const noMethodContext = { ... context, request: { ...context.request, url: noMethodURL } };

      await expect(pkceHandler.handle(noMethodContext).toPromise())
        .resolves.toEqual({ ...response, body: responseBody });

      noMethodURL.searchParams.delete('code_challenge_method');

      await expect(pkceHandler.handle(noMethodContext).toPromise())
        .resolves.toEqual({ ...response, body: responseBody });

    });

    it('should use the given state as a key to save the challenge & method & state in memory', async () => {

      await pkceHandler.handle(context).toPromise();

      await expect(store.get(state)
        .then((data) => data)).resolves.toEqual(challengeAndMethodAndState);

    });

  });

  describe('canHandle', () => {

    it('should return false if no context was provided', async () => {

      await expect(pkceHandler.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(pkceHandler.canHandle(undefined).toPromise()).resolves.toEqual(false);

    });

    it('should return false if no request was provided', async () => {

      await expect(pkceHandler.canHandle({ ...context, request: undefined }).toPromise()).resolves.toEqual(false);
      await expect(pkceHandler.canHandle({ ...context, request: null }).toPromise()).resolves.toEqual(false);

    });

    it('should return true if correct context was provided', async () => {

      await expect(pkceHandler.canHandle(context).toPromise()).resolves.toEqual(true);

    });

  });

});
