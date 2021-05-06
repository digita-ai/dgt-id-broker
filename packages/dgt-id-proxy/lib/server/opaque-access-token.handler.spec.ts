import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { SignJWT } from 'jose/jwt/sign';
import { decode } from 'jose/util/base64url';
import { fromKeyLike } from 'jose/jwk/from_key_like';
import fetchMock from 'jest-fetch-mock';
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
  let url: string;

  const mockedIdToken = async (privateKey) => new SignJWT(
    {
      sub: '23121d3c-84df-44ac-b458-3d63a9a05497',
      scope: '',
      client_id: 'client',
      iss: 'http://localhost:3000',
      aud: 'http://digita.ai',
    },
  )
    .setProtectedHeader({ alg: 'ES256', kid: 'mockKeyId', typ: 'jwt'  })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);

  beforeAll(() => {
    fetchMock.enableMocks();
  });

  beforeEach(() => {
    url = 'http://digita.ai';
    nestedHandler = {
      handle: jest.fn(),
      canHandle: jest.fn(),
      safeHandle: jest.fn(),
    };
    handler = new OpaqueAccessTokenHandler(nestedHandler, url);
    context = { request: { headers: {}, method: 'POST', url: new URL('http://digita.ai/'), body: 'client_id=mockClient' } };
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('should error when no handler or upstreamUrl is provided', () => {
    expect(() => new OpaqueAccessTokenHandler(undefined, url)).toThrow('handler must be defined');
    expect(() => new OpaqueAccessTokenHandler(null, url)).toThrow('handler must be defined');
    expect(() => new OpaqueAccessTokenHandler(nestedHandler, undefined)).toThrow('upstreamUrl must be defined');
    expect(() => new OpaqueAccessTokenHandler(nestedHandler, null)).toThrow('upstreamUrl must be defined');
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

    it('should error when no context request body is provided', async () => {
      context.request.body = null;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No body was included in the request');
      context.request.body = undefined;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No body was included in the request');
    });

    it('should error when no request body does not contain a client_id is provided', async () => {
      context.request.body = 'noClientId';
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('Request body must contain a client_id claim');
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

    it('should return a token with the issuer set to the proxy and the aud, sub, iat and exp claims of the id token', async () => {
      const keyPair = await generateKeyPair('ES256');
      const publicJwk = await fromKeyLike(keyPair.publicKey);
      publicJwk.kid = 'mockKeyId';
      publicJwk.alg = 'ES256';

      const idToken = await mockedIdToken(keyPair.privateKey);
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

      // mock the fetches of the verifyUpstreamJwk function
      fetchMock.mockResponses(
        [ JSON.stringify({ jwks_uri: 'http://pathtojwks.com' }), { status: 200 } ],
        [ JSON.stringify({ keys: [ publicJwk ] }), { status: 200 } ],
      );

      const resp = await handler.handle(context).toPromise();
      expect(resp.status).toEqual(200);

      expect(resp.body.access_token).toBeDefined();
      expect(resp.body.access_token.payload.aud).toEqual(decodedIdTokenPayload.aud);
      expect(resp.body.access_token.payload.sub).toEqual(decodedIdTokenPayload.sub);
      expect(resp.body.access_token.payload.iat).toEqual(decodedIdTokenPayload.iat);
      expect(resp.body.access_token.payload.exp).toEqual(decodedIdTokenPayload.exp);
      expect(resp.body.access_token.payload.client_id).toEqual('mockClient');

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
      it('should return false when no context request body is provided', async () => {
        context.request.body = null;
        await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
        context.request.body = undefined;
        await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
      });

      it('should return true if correct context was provided', async () => {
        await expect(handler.canHandle(context).toPromise()).resolves.toEqual(true);
      });
    });
  });
});
