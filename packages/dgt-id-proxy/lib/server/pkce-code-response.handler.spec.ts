import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import{ lastValueFrom } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';
import { PkceCodeResponseHandler } from './pkce-code-response.handler';

describe('PkceCodeResponseHandler', () => {

  let pkceCodeRequestHandler: PkceCodeResponseHandler;
  let response: HttpHandlerResponse;

  const challengeAndMethod = {
    challenge: 'code_challenge_value',
    method: 'S256',
  };

  const store = new InMemoryStore() as InMemoryStore<Code, ChallengeAndMethod>;
  const state = '9c59c72b-c282-4370-bfae-33f3f5dfb42e';
  const code = 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET';
  const redirectUri = 'http://redirect-uri.com';

  const challengeAndMethodAndState = {
    challenge: 'code_challenge_value',
    method: 'S256',
    state,
  };

  beforeEach(async () => {

    response = {
      body: '',
      headers: {
        location: `${redirectUri}/requests.html?code=${code}&state=${state}`,
      },
      status: 302,
    };

    store.set(state, challengeAndMethod);

    pkceCodeRequestHandler = new PkceCodeResponseHandler(store, redirectUri);

  });

  it('should be correctly instantiated if all deps are provided', () => {

    expect(pkceCodeRequestHandler).toBeTruthy();

  });

  it('should error when no handler or memory store was provided', () => {

    expect(() => new PkceCodeResponseHandler(undefined, redirectUri)).toThrow('A store must be provided');
    expect(() => new PkceCodeResponseHandler(null, redirectUri)).toThrow('A store must be provided');

  });

  it('should error when no redirectUri was provided', () => {

    expect(() => new PkceCodeResponseHandler(store, undefined)).toThrow('A redirectUri must be provided');
    expect(() => new PkceCodeResponseHandler(store, null)).toThrow('A redirectUri must be provided');

  });

  describe('handle', () => {

    it('should error when no response was provided', async () => {

      await expect(() => lastValueFrom(pkceCodeRequestHandler.handle(undefined))).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => lastValueFrom(pkceCodeRequestHandler.handle(null))).rejects.toThrow('Context cannot be null or undefined');

    });

    it('should delete the inMemory data with the state as key from the store if no state was included in the value', async () => {

      await lastValueFrom(pkceCodeRequestHandler.handle(response));
      expect(store.get(state).then((data) => data)).resolves.toBeUndefined();

    });

    it('should delete the inMemory data with the state as key from the store if no state was included in the value', async () => {

      store.delete(state);
      store.set(state, challengeAndMethodAndState);
      await lastValueFrom(pkceCodeRequestHandler.handle(response));
      expect(store.get(state).then((data) => data)).resolves.toBeUndefined();

    });

    it('should switch the state key with the code in the store', async () => {

      await lastValueFrom(pkceCodeRequestHandler.handle(response));
      await expect(store.get(code).then((data) => data)).resolves.toEqual(challengeAndMethod);

    });

    it('should error when no data was found in the store', async () => {

      store.delete(state);
      await expect(lastValueFrom(pkceCodeRequestHandler.handle(response))).rejects.toThrow('No data was found in the store');

    });

    it('should error if no state in the location', async () => {

      response.headers.location = `${redirectUri}/requests.html?code=${code}`;
      await expect(lastValueFrom(pkceCodeRequestHandler.handle(response))).rejects.toThrow('No data was found in the store');

    });

    it('should straight return the response when no code was included', async () => {

      response.headers.location = `${redirectUri}/requests.html?state=${state}`;
      await expect(lastValueFrom(pkceCodeRequestHandler.handle(response))).resolves.toEqual(response);

    });

    it('should return the response if creating a URL fails (e.g. /interaction, /auth/dynamic call)', async () => {

      response.headers.location = `/auth/123456`;
      await expect(lastValueFrom(pkceCodeRequestHandler.handle(response))).resolves.toEqual(response);

    });

  });

  describe('canHandle', () => {

    it('should return true if response is complete', async () => {

      await expect(lastValueFrom(pkceCodeRequestHandler.canHandle(response))).resolves.toEqual(true);

    });

    it('should return false if response is null or undefined', async () => {

      await expect(lastValueFrom(pkceCodeRequestHandler.canHandle(null))).resolves.toEqual(false);
      await expect(lastValueFrom(pkceCodeRequestHandler.canHandle(undefined))).resolves.toEqual(false);

    });

  });

});
