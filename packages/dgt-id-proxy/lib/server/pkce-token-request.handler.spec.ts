import { createHash } from 'crypto';
import { of } from 'rxjs';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse, InternalServerError, MethodNotAllowedHttpError } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';
import { Code, ChallengeAndMethod } from '../util/models';
import { PkceTokenRequestHandler } from './pkce-token-request.handler';

const generateRandomString = (length: number): string => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

describe('PkceTokenRequestHandler', () => {
  let pkceTokenRequestHandler: PkceTokenRequestHandler;
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

  beforeEach(async () => {
    httpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValueOnce(of()),
      safeHandle: jest.fn(),
    } as HttpHandler;

    store = new InMemoryStore();

    context = { request: { headers: {}, body: `grant_type=authorization_code&code=${code}&client_id=${client_id}&redirect_uri=${redirect_uri}&code_verifier=${code_verifier}`, method: 'POST', url } };

    pkceTokenRequestHandler = new PkceTokenRequestHandler(httpHandler, store);
    challengeAndMethod.challenge = pkceTokenRequestHandler
      .generateCodeChallenge(code_verifier, challengeAndMethod.method);
    bodyParams = new URLSearchParams(context.request.body);
    store.set(bodyParams.get('code'), challengeAndMethod);

    response =  {
      body: '',
      headers: { 'access-control-allow-origin': context.request.headers.origin },
      status: 400,
    };
  });

  it('should be correctly instantiated if all deps are provided', () => {
    expect(pkceTokenRequestHandler).toBeTruthy();
  });

  it('should error when no handler or memory store was provided', () => {
    expect(() => new PkceTokenRequestHandler(undefined, store)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceTokenRequestHandler(null, store)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceTokenRequestHandler(httpHandler, undefined)).toThrow('A store must be provided');
    expect(() => new PkceTokenRequestHandler(httpHandler, null)).toThrow('A store must be provided');
  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {
      await expect(() => pkceTokenRequestHandler.handle(undefined).toPromise()).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => pkceTokenRequestHandler.handle(null).toPromise()).rejects.toThrow('Context cannot be null or undefined');
    });

    it('should error when no context request is provided', async () => {
      context.request = null;
      await expect(() => pkceTokenRequestHandler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
      context.request = undefined;
      await expect(() => pkceTokenRequestHandler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
    });

    it('should error when no context request body is provided', async () => {
      context.request.body = null;
      await expect(() => pkceTokenRequestHandler.handle(context).toPromise()).rejects.toThrow('No body was included in the request');
      context.request.body= undefined;
      await expect(() => pkceTokenRequestHandler.handle(context).toPromise()).rejects.toThrow('No body was included in the request');
    });

    it('should error when no code_verifier was provided', async () => {
      bodyParams.delete('code_verifier');
      context.request.body = bodyParams.toString();
      response.body = JSON.stringify({ error: 'invalid_request', error_description: 'Code verifier is required.' });

      await expect(pkceTokenRequestHandler.handle(context).toPromise()).resolves.toEqual(response);
    });

    it('should error when code_verifier is not the correct length', async () => {
      bodyParams.set('code_verifier', 'short_verifier');
      context.request.body = bodyParams.toString();
      response.body = JSON.stringify({ error: 'invalid_request', error_description: 'Code verifier must be between 43 and 128 characters.' });

      await expect(pkceTokenRequestHandler.handle(context).toPromise()).resolves.toEqual(response);
    });

    it('should error when no authorization code was provided', async () => {
      bodyParams.delete('code');
      context.request.body = bodyParams.toString();
      response.body = JSON.stringify({ error: 'invalid_request', error_description: 'An authorization code is required.' });
      await expect(pkceTokenRequestHandler.handle(context).toPromise()).resolves.toEqual(response);
    });

    it('should error when no given charset not supported', async () => {
      context.request.headers['content-type'] = 'application/x-www-form-urlencoded;charset=ABC-1';
      await expect(pkceTokenRequestHandler.handle(context).toPromise()).rejects.toThrow('The specified charset is not supported');
    });

    it('should set the charset to utf-8 if no charset was included in the content-type header', async () => {
      context.request.headers['content-type'] = 'application/x-www-form-urlencoded;';
      await pkceTokenRequestHandler.handle(context).toPromise();
      const byteLen = Buffer.byteLength(context.request.body, 'utf-8').toString();
      expect(context.request.headers['content-length']).toEqual(byteLen);
    });

    it('should set the content-length header to the correct bytelength', async () => {
      context.request.headers['content-type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
      await pkceTokenRequestHandler.handle(context).toPromise();
      const byteLen = Buffer.byteLength(context.request.body, 'utf-8').toString();
      expect(context.request.headers['content-length']).toEqual(byteLen);
    });

    describe('store', () => {
      it('should get the associated challenge and method from the store', async () => {
        const challengeInStore = await store.get(code);
        const challengeReceived = pkceTokenRequestHandler
          .generateCodeChallenge(code_verifier, challengeAndMethod.method);
        expect(challengeInStore.challenge).toEqual(challengeReceived);
      });

      it('should give a valid error when code challenges do not match', async () => {
        challengeAndMethod.challenge = 'non_matching_challenge';
        response.body = JSON.stringify({ error: 'invalid_grant', error_description: 'Code challenges do not match.' });

        await expect(pkceTokenRequestHandler.handle(context).toPromise()).resolves.toEqual(response);
      });

      it('should reply with an InternalServerError when nothing was found in the store', async () => {
        store.delete(code);
        await expect(pkceTokenRequestHandler.handle(context).toPromise()).rejects.toBeInstanceOf(InternalServerError);
      });

      it('should call the httpHandler when the code challenges match', async () => {
        await pkceTokenRequestHandler.handle(context).toPromise();
        expect(httpHandler.handle).toHaveBeenCalledTimes(1);
        expect(httpHandler.handle).toHaveBeenCalledWith(context);
      });

      it('should just call the httpHandler handle when request method is options', async () => {
        context.request.method = 'OPTIONS';
        await pkceTokenRequestHandler.handle(context).toPromise();
        expect(httpHandler.handle).toHaveBeenCalledTimes(1);
        expect(httpHandler.handle).toHaveBeenCalledWith(context);
      });

      it('should just throw a method not allowed error when request method is not options or post', async () => {
        context.request.method = 'GET';
        await expect(pkceTokenRequestHandler.handle(context).toPromise())
          .rejects.toBeInstanceOf(MethodNotAllowedHttpError);
      });
    });

    describe('canHandle', () => {
      it('should return false if context is null or undefined', async () => {
        await expect(pkceTokenRequestHandler.canHandle(null).toPromise()).resolves.toEqual(false);
        await expect(pkceTokenRequestHandler.canHandle(undefined).toPromise()).resolves.toEqual(false);
      });

      it('should return false if context.request is null or undefined', async () => {
        context.request = null;
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
        context.request = undefined;
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
      });

      it('should return false if context.request.url is null or undefined', async () => {
        context.request.url = null;
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
        context.request.url = undefined;
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
      });

      it('should return false if context.request.body is null or undefined', async () => {
        context.request.body = null;
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
        context.request.body = undefined;
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
      });

      it('should return false if context.request.body.code_verifier is null or undefined', async () => {
        bodyParams.delete('code_verifier');
        context.request.body = bodyParams.toString();
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
      });

      it('should return false if context.request.url.body.code is null or undefined', async () => {
        bodyParams.delete('code');
        context.request.body = bodyParams.toString();
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
      });

      it('should return true if context is complete', async () => {
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(true);
      });
    });

    describe('base64URL', () => {
      it('should encode the string', async () => {
        const plainCode_verifier = 'code_verifier';
        const encodedCode_verifier = 'Y29kZV92ZXJpZmllcg';
        expect(pkceTokenRequestHandler.base64URL(plainCode_verifier)).toEqual(encodedCode_verifier);
      });
    });

    describe('generateCodeChallenge', () => {
      it('should call return a plain code_verifier when the algorithm is plain', () => {
        expect(pkceTokenRequestHandler
          .generateCodeChallenge(code_verifier, 'plain')).toEqual(code_verifier);
      });

      it('should call return hashed & encoded code_verifier when the algorithm is S256', () => {
        const hash = createHash('sha256');
        hash.update(code_verifier);
        const hashed = hash.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        expect(pkceTokenRequestHandler.generateCodeChallenge(code_verifier, 'S256')).toEqual(hashed);
      });

      it('should error when the algorithm is not supported', async () => {
        challengeAndMethod.method = '123';
        response.body = JSON.stringify({ error: 'invalid_request', error_description: 'Transform algorithm not supported.' });
        await expect(pkceTokenRequestHandler.handle(context).toPromise()).resolves.toEqual(response);
      });

    });
  });

});
