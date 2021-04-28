import { of } from 'rxjs';
import { HttpHandlerContext, HttpHandler } from '@digita-ai/handlersjs-http';
import { SignJWT } from 'jose/jwt/sign';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { InMemoryStore } from '../storage/in-memory-store';
import { AccessTokenDecodeHandler } from './access-token-decode.handler';

describe('AccessTokenDecodeHandler', () => {
  let handler: AccessTokenDecodeHandler;
  let nestedHandler: HttpHandler;
  let keyValueStore: InMemoryStore<string, string[]>;
  let context: HttpHandlerContext;

  beforeEach(async () => {
    context = { request: { headers: { 'origin': 'http://localhost' }, method: 'POST', url: new URL('http://digita.ai/') } };
    nestedHandler = {
      handle: jest.fn(),
      canHandle: jest.fn(),
      safeHandle: jest.fn(),
    };
    keyValueStore = new InMemoryStore();
    handler = new AccessTokenDecodeHandler(nestedHandler);

  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('should error when no handler, keyValueStore, pathToJwks or proxyUrl is provided', () => {
    expect(() => new AccessTokenDecodeHandler(undefined)).toThrow('A handler must be provided');
    expect(() => new AccessTokenDecodeHandler(null)).toThrow('A handler must be provided');
  });

  describe('handle', () => {
    it('should error when no context was provided', async () => {
      await expect(() => handler.handle(undefined).toPromise()).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => handler.handle(null).toPromise()).rejects.toThrow('Context cannot be null or undefined');
    });

    it('should error when no context request is provided', async () => {
      context.request = null;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
      context.request = undefined;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
    });

    it('should error when no context request method is provided', async () => {
      context.request.method = null;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No method was included in the request');
      context.request.method = undefined;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No method was included in the request');
    });

    it('should error when no context request headers are provided', async () => {
      context.request.headers = null;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No headers were included in the request');
      context.request.headers = undefined;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No headers were included in the request');
    });

    it('should error when no context request url is provided', async () => {
      context.request.url = null;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No url was included in the request');
      context.request.url = undefined;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No url was included in the request');
    });

    it('should error when method is not OPTIONS or POST', async () => {
      context.request.method = 'GET';
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('this method is not supported.');
    });

    it('should return the response of the nestedHandler unedited when method is OPTIONS', async () => {
      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({ body: 'options', headers: {}, status: 200 }));
      context.request.method = 'OPTIONS';
      await expect(handler.handle(context).toPromise()).resolves.toEqual({ body: 'options', headers: {}, status: 200 });
    });

    it('should return an error response when the upstream server returns a response with status other than 200', async () => {
      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({
        body: JSON.stringify({ error: 'invalid_request', error_description: 'grant request invalid' }),
        headers: {},
        status: 400,
      }));

      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_request', error_description: 'grant request invalid' }),
        headers: {},
        status: 400,
      });
    });

    it('should return a response with a decoded access token header and payload when method is POST and upstream returns 200 response', async () => {
      const keyPair = await generateKeyPair('ES256');
      const mockedUpstreamAccessToken = await new SignJWT({
        'jti': 'mockJti',
        'sub': 'mockSub',
        'iat': 1619085373,
        'exp': 1619092573,
        'scope': 'mockScope',
        'client_id': 'mockClient',
        'iss': 'http://mock-issuer.com',
        'aud': 'mockAudience',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'at+jwt',
          kid: 'idofakey',
        })
        .sign(keyPair.privateKey);

      const mockUpstreamResponse = {
        body: JSON.stringify({
          access_token: mockedUpstreamAccessToken,
          expires_in: 7200,
          scope: 'mockScope',
          token_type: 'Bearer',
        }),
        headers: {},
        status: 200,
      };

      nestedHandler.handle = jest.fn().mockReturnValueOnce(of(mockUpstreamResponse));
      await expect(handler.handle(context).toPromise()).resolves.toEqual(
        {
          body: {
            access_token: {
              header: {
                alg: 'ES256',
                typ: 'at+jwt',
                kid: 'idofakey',
              },
              payload: {
                'jti': 'mockJti',
                'sub': 'mockSub',
                'iat': 1619085373,
                'exp': 1619092573,
                'scope': 'mockScope',
                'client_id': 'mockClient',
                'iss': 'http://mock-issuer.com',
                'aud': 'mockAudience',
              },
            },
            expires_in: 7200,
            scope: 'mockScope',
            token_type: 'Bearer',
          },
          headers: {},
          status: 200,
        },
      );
    });
  });

  describe('canHandle', () => {
    it('should return false if no context was provided', async () => {
      await expect(handler.canHandle(undefined).toPromise()).resolves.toEqual(false);
      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);
    });

    it('should return false if context was provided', async () => {
      context.request = undefined;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request = null;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return false when no context request method is provided', async () => {
      context.request.method = null;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request.method = undefined;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return false when no context request headers are provided', async () => {
      context.request.headers = null;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request.headers = undefined;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return false when no context request url is provided', async () => {
      context.request.url = null;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request.url = undefined;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return true if correct context was provided', async () => {
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(true);
    });
  });
});
