import { readFile } from 'fs/promises';
import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { KeyLike, SignJWT } from 'jose/jwt/sign';
import { parseJwk } from 'jose/jwk/parse';
import { decode } from 'jose/util/base64url';
import { AccessTokenEncodeHandler } from './access-token-encode.handler';

jest.mock('fs/promises', () => {
  const testJwks = {
    'keys': [
      {
        'crv': 'P-256',
        'x': 'ZXD5luOOClkYI-WieNfw7WGISxIPjH_PWrtvDZRZsf0',
        'y': 'vshKz414TtqkkM7gNXKqawrszn44OTSR_j-JxP-BlWo',
        'd': '07JS0yPt-fDABw_28JdENtlF0PTNMchYmfSXz7pRhVw',
        'kty': 'EC',
        'kid': 'Eqa03FG9Z7AUQx5iRvpwwnkjAdy-PwmUYKLQFIgSY5E',
        'alg': 'ES256',
        'use': 'sig',
      },
    ],
  };
  return {
    readFile: jest.fn().mockResolvedValue(Buffer.from(JSON.stringify(testJwks))),
  };
});

describe('AccessTokenEncodeHandler', () => {
  let handler: AccessTokenEncodeHandler;
  let nestedHandler: HttpHandler;
  let context: HttpHandlerContext;
  let privateKey: KeyLike;
  let proxyUrl: string;

  beforeAll(async () => {
    privateKey = await parseJwk({
      'crv': 'P-256',
      'x': 'ZXD5luOOClkYI-WieNfw7WGISxIPjH_PWrtvDZRZsf0',
      'y': 'vshKz414TtqkkM7gNXKqawrszn44OTSR_j-JxP-BlWo',
      'd': '07JS0yPt-fDABw_28JdENtlF0PTNMchYmfSXz7pRhVw',
      'kty': 'EC',
      'kid': 'Eqa03FG9Z7AUQx5iRvpwwnkjAdy-PwmUYKLQFIgSY5E',
      'alg': 'ES256',
      'use': 'sig',
    });
  });

  beforeEach(() => {
    proxyUrl = 'http://mock-proxy.com';
    nestedHandler = {
      handle: jest.fn(),
      canHandle: jest.fn(),
      safeHandle: jest.fn(),
    };
    handler = new AccessTokenEncodeHandler(nestedHandler, 'assets/jwks.json', proxyUrl);
    context = { request: { headers: { 'origin': 'http://localhost' }, method: 'POST', url: new URL('http://digita.ai/') } };
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('should error when no handler or proxyUrl is provided in the constructor', () => {
    expect(() => new AccessTokenEncodeHandler(undefined, 'assets/jwks.json', proxyUrl)).toThrow('A handler must be provided');
    expect(() => new AccessTokenEncodeHandler(null, 'assets/jwks.json', proxyUrl)).toThrow('A handler must be provided');
    expect(() => new AccessTokenEncodeHandler(nestedHandler, undefined, proxyUrl)).toThrow('A pathToJwks must be provided');
    expect(() => new AccessTokenEncodeHandler(nestedHandler, null, proxyUrl)).toThrow('A pathToJwks must be provided');
    expect(() => new AccessTokenEncodeHandler(nestedHandler, 'assets/jwks.json', undefined)).toThrow('A proxyUrl must be provided');
    expect(() => new AccessTokenEncodeHandler(nestedHandler, 'assets/jwks.json', null)).toThrow('A proxyUrl must be provided');

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

    it('should return an error response when the nested handler returns a response with status other than 200', async () => {
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

    it('should return an encoded access token when the nested handler returns a 200 response', async () => {
      const payload = {
        'jti': 'mockJti',
        'sub': 'mockSub',
        'iat': 1619085373,
        'exp': 1619092573,
        'scope': 'mockScope',
        'client_id': 'mockClient',
        'iss': 'http://mock-issuer.com',
        'aud': 'mockAudience',
      };
      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({
        body: {
          access_token: {
            header: {
              alg: 'ES256',
              typ: 'at+jwt',
              kid: 'idofakey',
            },
            payload,
          },
          id_token: 'mockIdToken',
          expires_in: 7200,
          scope: 'mockScope',
          token_type: 'Bearer',
        },
        headers: {},
        status: 200,
      }));

      const encodedAccessToken = await new SignJWT(payload)
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'at+jwt',
          kid: 'Eqa03FG9Z7AUQx5iRvpwwnkjAdy-PwmUYKLQFIgSY5E',
        })
        .sign(privateKey);

      const response = await handler.handle(context).toPromise();
      const parsedBody = JSON.parse(response.body);
      expect(parsedBody.id_token).toEqual('mockIdToken');
      expect(parsedBody.expires_in).toEqual(7200);
      expect(parsedBody.scope).toEqual('mockScope');
      expect(parsedBody.token_type).toEqual('Bearer');

      expect(response.headers['content-type']).toEqual('application/json');
      expect(response.status).toEqual(200);

      const decodedHeader = JSON.parse(decode(parsedBody.access_token.split('.')[0]).toString());
      const encodedPayload = JSON.parse(decode(parsedBody.access_token.split('.')[1]).toString());

      expect(decodedHeader).toEqual({
        alg: 'ES256',
        typ: 'at+jwt',
        kid: 'Eqa03FG9Z7AUQx5iRvpwwnkjAdy-PwmUYKLQFIgSY5E',
      });

      expect(encodedPayload.jti).toBeDefined();
      expect(encodedPayload.iat).toBeDefined();
      expect(encodedPayload.exp).toBeDefined();
      expect(encodedPayload.sub).toEqual(payload.sub);
      expect(encodedPayload.scope).toEqual(payload.scope);
      expect(encodedPayload.client_id).toEqual(payload.client_id);
      expect(encodedPayload.iss).toEqual(proxyUrl);
      expect(encodedPayload.aud).toEqual(payload.aud);
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
