import { of } from 'rxjs';
import { HttpHandlerContext, HttpHandler } from '@digita-ai/handlersjs-http';
import { SignJWT } from 'jose/jwt/sign';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { InMemoryStore } from '../storage/in-memory-store';
import { AccessTokenDecodeHandler } from './access-token-decode.handler';

describe('AccessTokenDecodeHandler', () => {
  let handler: AccessTokenDecodeHandler;

  beforeEach(async () => {
    handler = new AccessTokenDecodeHandler();
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
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

    it('should error when the response body does not contain an access token', async () => {
      const mockResponse = {
        body: JSON.stringify({ 'mockKey': 'mockBody' }),
        headers: {},
        status: 200,
      };

      await expect(() => handler.handle(mockResponse).toPromise()).rejects.toThrow('the response body did not include an access token.');
    });

    it('should error when the response body does not contain a valid JWT access token', async () => {
      const mockResponse = {
        body: JSON.stringify({ 'access_token': 'notAValidJwt' }),
        headers: {},
        status: 200,
      };

      await expect(() => handler.handle(mockResponse).toPromise()).rejects.toThrow('the access token is not a valid JWT');
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
          id_token: 'mockIdToken',
          scope: 'mockScope',
          token_type: 'Bearer',
        }),
        headers: {},
        status: 200,
      };

      await expect(handler.handle(mockUpstreamResponse).toPromise()).resolves.toEqual(
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
            id_token: 'mockIdToken',
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
