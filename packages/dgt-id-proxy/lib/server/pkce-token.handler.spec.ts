import { createHash } from 'crypto';
import { lastValueFrom, of } from 'rxjs';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, InternalServerError } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';
import { Code, ChallengeAndMethod } from '../util/code-challenge-method';
import { PkceTokenHandler } from './pkce-token.handler';

const generateRandomString = (length: number): string => {

  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

  for (let i = 0; i < length; i++) {

    text += possible.charAt(Math.floor(Math.random() * possible.length));

  }

  return text;

};

describe('PkceTokenHandler', () => {

  let pkceTokenRequestHandler: PkceTokenHandler;
  let httpHandler: HttpHandler;
  let store: InMemoryStore<Code, ChallengeAndMethod>;
  let context: HttpHandlerContext;
  let response: HttpHandlerResponse;
  let bodyParams: URLSearchParams;

  const challengeAndMethod = {
    challenge: '',
    method: 'S256',
  };

  const referer = 'http://client.example.com';
  const url =  new URL(`${referer}/token`);
  const redirect_uri = encodeURI('http://client.example.com/requests.html');
  const client_id = encodeURI('http://solidpod./jaspervandenberghen/profile/card#me');

  const code_verifier = generateRandomString(128);
  const code = 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET';

  const authCodeBody = `grant_type=authorization_code&code=${code}&client_id=${client_id}&redirect_uri=${redirect_uri}&code_verifier=${code_verifier}`;
  const refreshTokenBody = `grant_type=refresh_token&refresh_token=refreshTokenMock&client_id=${client_id}`;

  beforeEach(async () => {

    httpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValueOnce(of({})),
      safeHandle: jest.fn(),
    } as HttpHandler;

    store = new InMemoryStore();

    context = { request: { headers: {}, body: authCodeBody, method: 'POST', url } };

    pkceTokenRequestHandler = new PkceTokenHandler(httpHandler, store);

    challengeAndMethod.challenge = await lastValueFrom(
      pkceTokenRequestHandler.generateCodeChallenge(code_verifier, challengeAndMethod.method)
    );

    bodyParams = new URLSearchParams(context.request.body);
    store.set(bodyParams.get('code'), challengeAndMethod);

    response =  {
      body: '',
      headers: { },
      status: 400,
    };

  });

  it('should be correctly instantiated if all deps are provided', () => {

    expect(pkceTokenRequestHandler).toBeTruthy();

  });

  it('should error when no handler or memory store was provided', () => {

    expect(() => new PkceTokenHandler(undefined, store)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceTokenHandler(null, store)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceTokenHandler(httpHandler, undefined)).toThrow('A store must be provided');
    expect(() => new PkceTokenHandler(httpHandler, null)).toThrow('A store must be provided');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => lastValueFrom(pkceTokenRequestHandler.handle(undefined))).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => lastValueFrom(pkceTokenRequestHandler.handle(null))).rejects.toThrow('Context cannot be null or undefined');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => lastValueFrom(pkceTokenRequestHandler.handle({
        ...context, request: null,
      }))).rejects.toThrow('No request was included in the context');

      await expect(() => lastValueFrom(pkceTokenRequestHandler.handle({
        ...context, request: undefined,
      }))).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request body is provided', async () => {

      await expect(() => lastValueFrom(pkceTokenRequestHandler.handle({
        ...context, request: { ...context.request, body: null },
      }))).rejects.toThrow('No body was included in the request');

      await expect(() => lastValueFrom(pkceTokenRequestHandler.handle({
        ...context, request: { ...context.request, body: undefined },
      }))).rejects.toThrow('No body was included in the request');

    });

    it('should pass the request to the httpHandler when grant_type is refresh_token', async () => {

      context = { request: { headers: {}, body: refreshTokenBody, method: 'POST', url } };

      await lastValueFrom(pkceTokenRequestHandler.handle(context));

      expect(httpHandler.handle).toHaveBeenCalledTimes(1);
      expect(httpHandler.handle).toHaveBeenCalledWith(context);

    });

    it('should error when no code_verifier was provided', async () => {

      bodyParams.delete('code_verifier');
      const contextWithoutVerifier = { ...context, request: { ...context.request, body: bodyParams.toString() } };
      const responseBody = JSON.stringify({ error: 'invalid_request', error_description: 'Code verifier is required.' });

      await expect(lastValueFrom(pkceTokenRequestHandler.handle(contextWithoutVerifier)))
        .resolves.toEqual({ ...response, body: responseBody });

    });

    it('should error when code_verifier is not the correct length', async () => {

      bodyParams.set('code_verifier', 'short_verifier');
      const contextWithShortVerifier = { ...context, request: { ...context.request, body: bodyParams.toString() } };
      const responseBody = JSON.stringify({ error: 'invalid_request', error_description: 'Code verifier must be between 43 and 128 characters.' });

      await expect(lastValueFrom(pkceTokenRequestHandler.handle(contextWithShortVerifier)))
        .resolves.toEqual({ ...response, body: responseBody });

    });

    it('should error when no authorization code was provided', async () => {

      bodyParams.delete('code');
      const contextWithNoCode = { ...context, request: { ...context.request, body: bodyParams.toString() } };
      const responseBody = JSON.stringify({ error: 'invalid_request', error_description: 'An authorization code is required.' });

      await expect(lastValueFrom(pkceTokenRequestHandler.handle(contextWithNoCode)))
        .resolves.toEqual({ ...response, body: responseBody });

    });

    it('should error when given charset is not supported', async () => {

      const contextWithWrongCharset = { ...context, request: { ...context.request, headers: { ...context.request.headers, 'content-type': 'application/x-www-form-urlencoded;charset=ABC-1' } } };
      expect(() => lastValueFrom(pkceTokenRequestHandler.handle(contextWithWrongCharset))).toThrow('The specified charset is not supported');

    });

    it('should set the charset to utf-8 if no charset was included in the content-type header', async () => {

      const contextWithNoCharset = { ...context, request: { ...context.request, headers: { ...context.request.headers, 'content-type': 'application/x-www-form-urlencoded;' } } };
      await lastValueFrom(pkceTokenRequestHandler.handle(contextWithNoCharset));
      const byteLen = Buffer.byteLength(contextWithNoCharset.request.body, 'utf-8').toString();
      expect(contextWithNoCharset.request.headers['content-length']).toEqual(byteLen);

    });

    it('should set the content-length header to the correct bytelength', async () => {

      const contextWithUTF8 = { ...context, request: { ...context.request, headers: { ...context.request.headers, 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' } } };
      await lastValueFrom(pkceTokenRequestHandler.handle(contextWithUTF8));
      const byteLen = Buffer.byteLength(contextWithUTF8.request.body, 'utf-8').toString();
      expect(contextWithUTF8.request.headers['content-length']).toEqual(byteLen);

    });

    describe('store', () => {

      it('should get the associated challenge and method from the store', async () => {

        const challengeInStore = await store.get(code);

        const challengeReceived = await lastValueFrom(
          pkceTokenRequestHandler.generateCodeChallenge(code_verifier, challengeAndMethod.method)
        );

        expect(challengeInStore.challenge).toEqual(challengeReceived);

      });

      it('should give a valid error when code challenges do not match', async () => {

        challengeAndMethod.challenge = 'non_matching_challenge';
        response.body = JSON.stringify({ error: 'invalid_grant', error_description: 'Code challenges do not match.' });

        await expect(lastValueFrom(pkceTokenRequestHandler.handle(context))).resolves.toEqual(response);

      });

      it('should reply with an InternalServerError when nothing was found in the store', async () => {

        store.delete(code);

        await expect(
          lastValueFrom(pkceTokenRequestHandler.handle(context))
        ).rejects.toBeInstanceOf(InternalServerError);

      });

      it('should call the httpHandler when the code challenges match', async () => {

        await lastValueFrom(pkceTokenRequestHandler.handle(context));
        expect(httpHandler.handle).toHaveBeenCalledTimes(1);
        expect(httpHandler.handle).toHaveBeenCalledWith(context);

      });

      it('should just call the httpHandler handle when request method is options', async () => {

        context.request.method = 'OPTIONS';
        await lastValueFrom(pkceTokenRequestHandler.handle(context));
        expect(httpHandler.handle).toHaveBeenCalledTimes(1);
        expect(httpHandler.handle).toHaveBeenCalledWith(context);

      });

    });

    describe('canHandle', () => {

      it('should return false if context is null or undefined', async () => {

        await expect(lastValueFrom(pkceTokenRequestHandler.canHandle(null))).resolves.toEqual(false);
        await expect(lastValueFrom(pkceTokenRequestHandler.canHandle(undefined))).resolves.toEqual(false);

      });

      it('should return false if context.request is null or undefined', async () => {

        await expect(lastValueFrom(pkceTokenRequestHandler.canHandle({
          ...context, request: null,
        }))).resolves.toEqual(false);

        await expect(lastValueFrom(pkceTokenRequestHandler.canHandle({
          ...context, request: undefined,
        }))).resolves.toEqual(false);

      });

      it('should return false if context.request.url is null or undefined', async () => {

        await expect(lastValueFrom(pkceTokenRequestHandler.canHandle({
          ...context, request: { ...context.request, url: null },
        }))).resolves.toEqual(false);

        await expect(lastValueFrom(pkceTokenRequestHandler.canHandle({
          ...context, request: { ...context.request, url: undefined },
        }))).resolves.toEqual(false);

      });

      it('should return false if context.request.body is null or undefined', async () => {

        await expect(lastValueFrom(pkceTokenRequestHandler.canHandle({
          ...context, request: { ...context.request, body: null },
        }))).resolves.toEqual(false);

        await expect(lastValueFrom(pkceTokenRequestHandler.canHandle({
          ...context, request: { ...context.request, body: undefined },
        }))).resolves.toEqual(false);

      });

      it('should return false if context.request.body.code_verifier is null or undefined', async () => {

        bodyParams.delete('code_verifier');
        const contextWithNoCodeVerifier = { ...context, request: { ...context.request, body: bodyParams.toString() } };

        await expect(
          lastValueFrom(pkceTokenRequestHandler.canHandle(contextWithNoCodeVerifier))
        ).resolves.toEqual(false);

      });

      it('should return false if context.request.url.body.code is null or undefined', async () => {

        bodyParams.delete('code');
        const contextWithNoCode = { ...context, request: { ...context.request, body: bodyParams.toString() } };
        await expect(lastValueFrom(pkceTokenRequestHandler.canHandle(contextWithNoCode))).resolves.toEqual(false);

      });

      it('should return true if context is complete', async () => {

        await expect(lastValueFrom(pkceTokenRequestHandler.canHandle(context))).resolves.toEqual(true);

      });

    });

  });

  describe('generateCodeChallenge', () => {

    it('should return a plain code_verifier when the algorithm is plain', async () => {

      await expect(lastValueFrom(
        pkceTokenRequestHandler.generateCodeChallenge(code_verifier, 'plain')
      )).resolves.toEqual(code_verifier);

    });

    it('should return hashed & encoded code_verifier when the algorithm is S256', async () => {

      const hash = createHash('sha256');
      hash.update(code_verifier);
      const hashed = hash.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

      await expect(lastValueFrom(
        pkceTokenRequestHandler.generateCodeChallenge(code_verifier, 'S256')
      )).resolves.toEqual(hashed);

    });

    it('should error when the algorithm is not supported', async () => {

      challengeAndMethod.method = '123';
      const responseBody = JSON.stringify({ error: 'invalid_request', error_description: 'Transform algorithm not supported.' });

      await expect(lastValueFrom(pkceTokenRequestHandler.handle(context)))
        .resolves.toEqual({ ...response, body: responseBody });

    });

  });

});
