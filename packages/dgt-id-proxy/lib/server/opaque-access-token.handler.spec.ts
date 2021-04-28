import { readFile } from 'fs/promises';
import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { SignJWT } from 'jose/jwt/sign';
import { decode } from 'jose/util/base64url';
import { OpaqueAccessTokenHandler } from './opaque-access-token.handler';

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

describe('OpaqueAccessTokenHandler', () => {
  let handler: OpaqueAccessTokenHandler;
  let nestedHandler: HttpHandler;
  let context: HttpHandlerContext;

  const mockedIdToken = async () => {
    const keyPair = await generateKeyPair('ES256');

    return new SignJWT(
      {
        sub: '23121d3c-84df-44ac-b458-3d63a9a05497',
        scope: '',
        client_id: 'client',
        iss: 'http://localhost:3000',
        aud: 'http://digita.ai',
      },
    )
      .setProtectedHeader({ alg: 'ES256', kid: 'keyid', typ: 'jwt'  })
      .setIssuedAt()
      .setExpirationTime(7200)
      .sign(keyPair.privateKey);
  };

  beforeEach(() => {
    nestedHandler = {
      handle: jest.fn(),
      canHandle: jest.fn(),
      safeHandle: jest.fn(),
    };
    handler = new OpaqueAccessTokenHandler(nestedHandler, 'assets/jwks.json', 'http://localhost:3003');
    context = { request: { headers: { 'origin': 'http://localhost' }, method: 'POST', url: new URL('http://digita.ai/') } };
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('should error when no handler or proxyUrl is provided in the constructor', () => {
    expect(() => new OpaqueAccessTokenHandler(undefined, 'assets/jwks.json', 'http://localhost:3003')).toThrow('A handler must be provided');
    expect(() => new OpaqueAccessTokenHandler(null, 'assets/jwks.json', 'http://localhost:3003')).toThrow('A handler must be provided');
    expect(() => new OpaqueAccessTokenHandler(nestedHandler, undefined, 'http://localhost:3003')).toThrow('A pathToJwks must be provided');
    expect(() => new OpaqueAccessTokenHandler(nestedHandler, null, 'http://localhost:3003')).toThrow('A pathToJwks must be provided');
    expect(() => new OpaqueAccessTokenHandler(nestedHandler, 'assets/jwks.json', undefined)).toThrow('A proxyUrl must be provided');
    expect(() => new OpaqueAccessTokenHandler(nestedHandler, 'assets/jwks.json', null)).toThrow('A proxyUrl must be provided');

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

    it('should return a token with the issuer set to the proxy and the aud and sub claims of the id token. Header typ should be "at+jwt"', async () => {
      // mocked response with audience as a string (single item)
      const idToken = await mockedIdToken();
      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({
        body: JSON.stringify({
          access_token: 'opaqueaccesstoken',
          id_token: idToken,
          expires_in: 7200,
          scope: '',
          token_type: 'Bearer',
        }),
        headers: {},
        status: 200,
      }));
      const decodedIdTokenPayload = JSON.parse(decode(idToken.split('.')[1]).toString());

      const resp = await handler.handle(context).toPromise();
      expect(resp.status).toEqual(200);

      const parsedBody = JSON.parse(resp.body);
      expect(parsedBody.access_token).toBeDefined();

      const tokenPayload = JSON.parse(decode(parsedBody.access_token.split('.')[1]).toString());
      expect(tokenPayload.iss).toEqual('http://localhost:3003');
      expect(tokenPayload.aud).toEqual(decodedIdTokenPayload.aud);
      expect(tokenPayload.sub).toEqual(decodedIdTokenPayload.sub);

      const tokenHeader = JSON.parse(decode(parsedBody.access_token.split('.')[0]).toString());
      expect(tokenHeader.typ).toEqual('at+jwt');

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
});
