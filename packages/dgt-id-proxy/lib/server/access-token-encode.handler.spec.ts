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
    handler = new AccessTokenEncodeHandler('assets/jwks.json', proxyUrl);
    context = { request: { headers: { 'origin': 'http://localhost' }, method: 'POST', url: new URL('http://digita.ai/') } };
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('should error when no proxyUrl or pathToJwks is provided in the constructor', () => {
    expect(() => new AccessTokenEncodeHandler(undefined, proxyUrl)).toThrow('A pathToJwks must be provided');
    expect(() => new AccessTokenEncodeHandler(null, proxyUrl)).toThrow('A pathToJwks must be provided');
    expect(() => new AccessTokenEncodeHandler('assets/jwks.json', undefined)).toThrow('A proxyUrl must be provided');
    expect(() => new AccessTokenEncodeHandler('assets/jwks.json', null)).toThrow('A proxyUrl must be provided');

  });

  describe('handle', () => {
    it('should error when no response was provided', async () => {
      await expect(() => handler.handle(undefined).toPromise()).rejects.toThrow('response cannot be null or undefined');
      await expect(() => handler.handle(null).toPromise()).rejects.toThrow('response cannot be null or undefined');
    });

    it('should return the response unedited if the status is not 200', async () => {
      const response = {
        body: 'mockbody',
        headers: {},
        status: 400,
      };

      await expect(handler.handle(response).toPromise()).resolves.toEqual({
        body: 'mockbody',
        headers: {},
        status: 400,
      });
    });

    it('should error when no access_token is included in the response body, or if the response body is not JSON', async () => {
      const bodyString = {
        body: 'mockBodyAsAString',
        headers: {},
        status: 200,
      };

      await expect(() => handler.handle(bodyString).toPromise()).rejects.toThrow('the response body did not include an access token, or the response body is not JSON');

      const bodyNoAccessToken = {
        body: {
          mockKey: 'mockValue',
        },
        headers: {},
        status: 200,
      };

      await expect(() => handler.handle(bodyNoAccessToken).toPromise()).rejects.toThrow('the response body did not include an access token, or the response body is not JSON');
    });

    it('should return an encoded access token when the response has a 200 status and contains an access token', async () => {
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
      const response = {
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
      };

      const encodedAccessTokenResponse = await handler.handle(response).toPromise();
      const parsedBody = JSON.parse(encodedAccessTokenResponse.body);
      expect(parsedBody.id_token).toEqual('mockIdToken');
      expect(parsedBody.expires_in).toEqual(7200);
      expect(parsedBody.scope).toEqual('mockScope');
      expect(parsedBody.token_type).toEqual('Bearer');

      expect(encodedAccessTokenResponse.headers['content-type']).toEqual('application/json');
      expect(encodedAccessTokenResponse.status).toEqual(200);

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
    it('should return false if no response was provided', async () => {
      await expect(handler.canHandle(undefined).toPromise()).resolves.toEqual(false);
      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);
    });

    it('should return true if a response was provided', async () => {
      const response = {
        body: 'mockBody',
        headers: {},
        status: 200,
      };
      await expect(handler.canHandle(response).toPromise()).resolves.toEqual(true);
    });
  });
});
