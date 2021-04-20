import { createHash } from 'crypto';
import { of } from 'rxjs';
import { HttpHandler, HttpHandlerContext, InternalServerError } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';
import { PkceTokenRequestHandler } from './pkce-token-request.handler';
import { Code, ChallengeAndMethod } from './pkce-auth-request.handler';

const generateRandomString = (length: number): string => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const base64URL = (str: string) => Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const challengeAndMethod = {
  challenge: '',
  method: 'S256',
};

const generateCodeChallenge = (code_verifier: string): string => {
  let challenge: string;
  if(challengeAndMethod.method === 'S256'){
    const hash = createHash('sha256');

    hash.update(code_verifier);

    challenge = hash.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return challenge;
  }
  return base64URL(code_verifier);
};

describe('PkceTokenRequestHandler', () => {
  let pkceTokenRequestHandler: PkceTokenRequestHandler;
  let httpHandler: HttpHandler;
  let inMemoryStore: InMemoryStore<Code, ChallengeAndMethod>;
  let context: HttpHandlerContext;
  let referer: string;
  let url: URL;
  let code_verifier: string;
  let auth_code: string;

  beforeEach(async () => {
    httpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValueOnce(of()),
      safeHandle: jest.fn(),
    } as HttpHandler;

    inMemoryStore = new InMemoryStore();

    referer = 'http://client.example.com';
    url = new URL(`${referer}/token`);
    code_verifier = generateRandomString(128);
    challengeAndMethod.challenge = generateCodeChallenge(code_verifier);
    auth_code = 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET';

    context = { request: { headers: {}, body: { code_verifier, auth_code }, method: 'POST', url } };

    inMemoryStore.set(context.request.body.auth_code, challengeAndMethod);

    pkceTokenRequestHandler = new PkceTokenRequestHandler(httpHandler, inMemoryStore);
  });

  it('should be correctly instantiated if all deps are provided', () => {
    expect(pkceTokenRequestHandler).toBeTruthy();
  });

  it('should error when no handler or memory store was provided', () => {
    expect(() => new PkceTokenRequestHandler(undefined, inMemoryStore)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceTokenRequestHandler(null, inMemoryStore)).toThrow('A HttpHandler must be provided');
    expect(() => new PkceTokenRequestHandler(httpHandler, undefined)).toThrow('An InMemoryStore must be provided');
    expect(() => new PkceTokenRequestHandler(httpHandler, null)).toThrow('An InMemoryStore must be provided');
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
      const noCodeVerifierContext = context;
      noCodeVerifierContext.request.body = { cd_vrfr: 'bla', auth_code };

      const response =  {
        body: JSON.stringify({ error: 'invalid_request', error_description: 'Code verifier is required.' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      };

      await expect(pkceTokenRequestHandler.handle(noCodeVerifierContext).toPromise()).resolves.toEqual(response);
      noCodeVerifierContext.request.body = { code_verifier: null, auth_code };
      await expect(pkceTokenRequestHandler.handle(noCodeVerifierContext).toPromise()).resolves.toEqual(response);
      noCodeVerifierContext.request.body = { code_verifier: undefined, auth_code };
      await expect(pkceTokenRequestHandler.handle(noCodeVerifierContext).toPromise()).resolves.toEqual(response);
    });

    it('should error when no authorization code was provided', async () => {
      const noCodeContext = context;
      noCodeContext.request.body = { code_verifier, kode: 'z' };

      const response =  {
        body: JSON.stringify({ error: 'invalid_request', error_description: 'An authorization code is required.' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      };

      await expect(pkceTokenRequestHandler.handle(noCodeContext).toPromise()).resolves.toEqual(response);
      noCodeContext.request.body = { code_verifier, auth_code: null };
      await expect(pkceTokenRequestHandler.handle(noCodeContext).toPromise()).resolves.toEqual(response);
      noCodeContext.request.body = { code_verifier, auth_code: undefined };
      await expect(pkceTokenRequestHandler.handle(noCodeContext).toPromise()).resolves.toEqual(response);
    });

    describe('inMemoryStore', () => {
      it('should get the associated challenge and method from the inMemoryStore', async () => {
        const challengeInStore = await inMemoryStore.get(auth_code);
        const challengeReceived = pkceTokenRequestHandler.generateCodeChallenge(code_verifier, challengeAndMethod);
        expect(challengeInStore.challenge).toEqual(challengeReceived);
      });

      it('should give a valid error when code challenges do not match', async () => {
        challengeAndMethod.challenge = 'ezffzekfkzfe';

        const response =  {
          body: JSON.stringify({ error: 'invalid_grant', error_description: 'Code challenges do not match.' }),
          headers: { 'access-control-allow-origin': context.request.headers.origin },
          status: 400,
        };

        await expect(pkceTokenRequestHandler.handle(context).toPromise()).resolves.toEqual(response);
      });

      it('should reply with an InternalServerError when nothing was found in the InMemoryStore', async () => {
        inMemoryStore.delete(auth_code);
        await expect(pkceTokenRequestHandler.handle(context).toPromise()).rejects.toBeInstanceOf(InternalServerError);
      });

      it('should call the httpHandler when the code challenges match', async () => {
        await pkceTokenRequestHandler.handle(context).toPromise();
        expect(httpHandler.handle).toHaveBeenCalledTimes(1);
        expect(httpHandler.handle).toHaveBeenCalledWith(context);
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
        context.request.body.code_verifier = null;
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
        context.request.body.code_verifier = undefined;
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
      });

      it('should return false if context.request.url.body.auth_code is null or undefined', async () => {
        context.request.body.auth_code = null;
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
        context.request.body.auth_code = undefined;
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(false);
      });

      it('should return true if context is complete', async () => {
        await expect(pkceTokenRequestHandler.canHandle(context).toPromise()).resolves.toEqual(true);
      });
    });

    describe('base64URL', () => {
      it('should encode the string', async () => {
        expect(pkceTokenRequestHandler.base64URL('bla')).toEqual('Ymxh');
      });
    });

    describe('generateCodeChallenge', () => {
      it('should error when the algorithm is not supported', () => {
        challengeAndMethod.method = '123';
        expect(() => pkceTokenRequestHandler.generateCodeChallenge(code_verifier, challengeAndMethod)).toThrow('Transform algorithm not supported.');
      });

      it('should call base64URL with a plain code_verifier when the algorithm is plain', () => {
        challengeAndMethod.method = 'plain';
        pkceTokenRequestHandler.base64URL = jest.fn();
        pkceTokenRequestHandler.generateCodeChallenge(code_verifier, challengeAndMethod);
        expect(pkceTokenRequestHandler.base64URL).toHaveBeenCalledWith(code_verifier);
      });

      it('should call return hashed & encoded code_verifier when the algorithm is S256', () => {
        challengeAndMethod.method = 'S256';

        const hash = createHash('sha256');
        hash.update(code_verifier);
        const hashed = hash.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

        pkceTokenRequestHandler.generateCodeChallenge = jest.fn().mockReturnValueOnce(hashed);
        pkceTokenRequestHandler.generateCodeChallenge(code_verifier, challengeAndMethod);
        expect(pkceTokenRequestHandler.generateCodeChallenge)
          .toHaveReturnedWith(hashed);
      });
    });
  });

});
