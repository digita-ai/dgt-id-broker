import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { SignJWT } from 'jose/jwt/sign';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import fetchMock from 'jest-fetch-mock';
import { fromKeyLike } from 'jose/jwk/from_key_like';
import { AccessTokenDecodeHandler } from './access-token-decode.handler';

describe('AccessTokenDecodeHandler', () => {
  let handler: AccessTokenDecodeHandler;
  let response: HttpHandlerResponse;
  let url: string;

  const secondsSinceEpoch = () => Math.floor(Date.now() / 1000);

  beforeAll(() => {
    fetchMock.enableMocks();
  });

  beforeEach(async () => {
    url = 'http://digita.ai';
    handler = new AccessTokenDecodeHandler(url);
    response = {
      body: 'mockbody',
      headers: {},
      status: 200,
    };
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('should be error when no upstreamUrl is provided', async () => {
    await expect(() => new AccessTokenDecodeHandler(null)).toThrow('upstreamUrl must be defined');
    await expect(() => new AccessTokenDecodeHandler(undefined)).toThrow('upstreamUrl must be defined');
  });

  describe('handle', () => {
    it('should error when no response was provided', async () => {
      await expect(() => handler.handle(undefined).toPromise()).rejects.toThrow('response cannot be null or undefined');
      await expect(() => handler.handle(null).toPromise()).rejects.toThrow('response cannot be null or undefined');
    });

    it('should return the response unedited if the status is not 200', async () => {
      response.status =  400;

      await expect(handler.handle(response).toPromise()).resolves.toEqual(response);
    });

    it('should error when the response body does not contain an access token', async () => {
      response.body = JSON.stringify({ 'mockKey': 'mockBody' });

      await expect(() => handler.handle(response).toPromise()).rejects.toThrow('the response body did not include an access token.');
    });

    it('should error when the response body does not contain a valid JWT access token', async () => {
      response.body = JSON.stringify({ 'access_token': 'notAValidJwt' });

      await expect(() => handler.handle(response).toPromise()).rejects.toThrow('the access token is not a valid JWT');
    });

    it('should return a response with a decoded access token header and payload when method is POST and upstream returns 200 response', async () => {
      const keyPair = await generateKeyPair('ES256');
      const publicJwk = await fromKeyLike(keyPair.publicKey);
      publicJwk.kid = 'mockKeyId';
      publicJwk.alg = 'ES256';

      // mock the fetches of the verifyUpstreamJwk function
      fetchMock.mockResponses(
        [ JSON.stringify({ jwks_uri: 'http://pathtojwks.com' }), { status: 200 } ],
        [ JSON.stringify({ keys: [ publicJwk ] }), { status: 200 } ],
      );

      const payload = {
        'jti': 'mockJti',
        'sub': 'mockSub',
        'iat': secondsSinceEpoch(),
        'exp': secondsSinceEpoch() + 7200,
        'scope': 'mockScope',
        'client_id': 'mockClient',
        'iss': 'http://mock-issuer.com',
        'aud': 'mockAudience',
      };
      const header = {
        alg: 'ES256',
        typ: 'at+jwt',
        kid: 'mockKeyId',
      };
      const mockedUpstreamAccessToken = await new SignJWT(payload)
        .setProtectedHeader(header)
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
              header,
              payload,
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
      await expect(handler.canHandle(response).toPromise()).resolves.toEqual(true);
    });
  });
});
