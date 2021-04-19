import { createHash } from 'crypto';
import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';
import { PkceTokenRequestHandler } from './pkce-token-request.handler';

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
  let inMemoryStore: InMemoryStore<string,  { challenge: string; method: string }>;
  let context: HttpHandlerContext;
  let url: URL;
  let code_verifier: string;

  beforeEach(async () => {
    httpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      safeHandle: jest.fn(),
    } as HttpHandler;
    inMemoryStore = new InMemoryStore();
    url = new URL('http://localhost:3000/token');
    code_verifier = generateRandomString(128);
    challengeAndMethod.challenge = generateCodeChallenge(code_verifier);
    context = { request: { headers: {}, body: { code_verifier,  code: 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET' }, method: 'POST', url } };
    inMemoryStore.set(context.request.body.code, challengeAndMethod);
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
      noCodeVerifierContext.request.body = { cd_vrfr: 'bla', code: 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET' };
      const response =  {
        body: JSON.stringify({ error: 'invalid_request', error_description: 'Code verifier is required.' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      };
      await expect(pkceTokenRequestHandler.handle(noCodeVerifierContext).toPromise()).resolves.toEqual(response);
      noCodeVerifierContext.request.body = { code_verifier: null, code: 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET' };
      await expect(pkceTokenRequestHandler.handle(noCodeVerifierContext).toPromise()).resolves.toEqual(response);
      noCodeVerifierContext.request.body = { code_verifier: undefined, code: 'bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET' };
      await expect(pkceTokenRequestHandler.handle(noCodeVerifierContext).toPromise()).resolves.toEqual(response);
    });

    it('should error when no code was provided', async () => {
      const noCodeContext = context;
      noCodeContext.request.body = { code_verifier, kode: 'z' };
      const response =  {
        body: JSON.stringify({ error: 'invalid_request', error_description: 'Code is required.' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      };
      await expect(pkceTokenRequestHandler.handle(noCodeContext).toPromise()).resolves.toEqual(response);
      noCodeContext.request.body = { code_verifier, code: null };
      await expect(pkceTokenRequestHandler.handle(noCodeContext).toPromise()).resolves.toEqual(response);
      noCodeContext.request.body = { code_verifier, code: undefined };
      await expect(pkceTokenRequestHandler.handle(noCodeContext).toPromise()).resolves.toEqual(response);
    });

    describe('inMemoryStore', () => {
      // dit bewijst eigenlijk niks...
      it('should get the associated challenge and method from the inMemoryStore', async () => {
        const challengeInStore = await inMemoryStore.get('bPzRowxr9fwlkNRcFTHp0guPuErKP0aUN9lvwiNT5ET');
        const challengeReceived = pkceTokenRequestHandler.generateCodeChallenge(code_verifier, challengeAndMethod);
        expect(challengeInStore.challenge).toEqual(challengeReceived);
      });

      it('should error when code challenges do not match', async () => {
        challengeAndMethod.challenge = 'ezffzekfkzfe';
        const response =  {
          body: JSON.stringify({ error: 'invalid_request', error_description: 'Code challenges do not match.' }),
          headers: { 'access-control-allow-origin': context.request.headers.origin },
          status: 400,
        };
        await expect(pkceTokenRequestHandler.handle(context).toPromise()).resolves.toEqual(response);
      });

    });
  });

});
