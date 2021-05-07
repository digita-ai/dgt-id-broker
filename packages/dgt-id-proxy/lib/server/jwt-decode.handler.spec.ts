import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { SignJWT } from 'jose/jwt/sign';
import { KeyLike, JWK } from 'jose/types';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import fetchMock from 'jest-fetch-mock';
import { fromKeyLike } from 'jose/jwk/from_key_like';
import { JwtDecodeHandler } from './jwt-decode.handler';

describe('JwtDecodeHandler', () => {
  let handler: JwtDecodeHandler;
  let response: HttpHandlerResponse;
  let url: string;
  let jwtFields: string[];
  let payload;
  let header;
  let privateKey: KeyLike;
  let publicJwk: JWK;

  const mockedUpstreamJwt = async () => new SignJWT(payload)
    .setProtectedHeader(header)
    .sign(privateKey);

  const secondsSinceEpoch = () => Math.floor(Date.now() / 1000);

  beforeAll(() => {
    fetchMock.enableMocks();
  });

  beforeEach(async () => {
    url = 'http://digita.ai';
    jwtFields = [ 'access_token', 'id_token' ];
    handler = new JwtDecodeHandler(jwtFields, url, false);
    response = {
      body: 'mockbody',
      headers: {},
      status: 200,
    };
    payload = {
      'jti': 'mockJti',
      'sub': 'mockSub',
      'iat': secondsSinceEpoch(),
      'exp': secondsSinceEpoch() + 7200,
      'scope': 'mockScope',
      'client_id': 'mockClient',
      'iss': 'http://mock-issuer.com',
      'aud': 'mockAudience',
    };
    header = {
      alg: 'ES256',
      typ: 'at+jwt',
      kid: 'mockKeyId',
    };
    const keyPair = await generateKeyPair('ES256');
    privateKey = keyPair.privateKey;
    publicJwk = await fromKeyLike(keyPair.publicKey);
    publicJwk.kid = 'mockKeyId';
    publicJwk.alg = 'ES256';
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('should be error when no upstreamUrl is provided', async () => {
    await expect(() => new JwtDecodeHandler(null, url, false)).toThrow('jwtFields must be defined and must contain at least 1 field');
    await expect(() => new JwtDecodeHandler(undefined, url, false)).toThrow('jwtFields must be defined and must contain at least 1 field');
    await expect(() => new JwtDecodeHandler(jwtFields, null, false)).toThrow('upstreamUrl must be defined');
    await expect(() => new JwtDecodeHandler(jwtFields, undefined, false)).toThrow('upstreamUrl must be defined');
    await expect(() => new JwtDecodeHandler(jwtFields, url, null)).toThrow('verifyJwk must be defined');
    await expect(() => new JwtDecodeHandler(jwtFields, url, undefined)).toThrow('verifyJwk must be defined');
  });

  it('should be error when passed an empty list of jwtFields', async () => {
    jwtFields = [];
    await expect(() => new JwtDecodeHandler(jwtFields, url, false)).toThrow('jwtFields must be defined and must contain at least 1 field');
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

    it('should error when the response body does not contain a field that is in the jwtFields list', async () => {
      const token = await mockedUpstreamJwt();
      response.body = JSON.stringify({ 'access_token': token });

      await expect(() => handler.handle(response).toPromise()).rejects.toThrow('the response body did not include the field "id_token"');
    });

    it('should error when the response body does not contain a valid jwt for a field that is in the jwtFields list', async () => {
      const token = await mockedUpstreamJwt();
      response.body = JSON.stringify({ 'access_token': token, 'id_token': 'notAValidJwt' });

      await expect(() => handler.handle(response).toPromise()).rejects.toThrow('the response body did not include a valid JWT for the field "id_token"');
    });

    it('should return a response with a decoded access token header and payload when upstream returns 200 response and verifyJwk is true', async () => {
      handler = new JwtDecodeHandler([ 'id_token' ], url, true);
      // mock the fetches of the verifyUpstreamJwk function
      fetchMock.mockResponses(
        [ JSON.stringify({ jwks_uri: 'http://pathtojwks.com' }), { status: 200 } ],
        [ JSON.stringify({ keys: [ publicJwk ] }), { status: 200 } ],
      );

      const id_token = await mockedUpstreamJwt();

      response.body = JSON.stringify({
        access_token: 'mockAccessToken',
        expires_in: 7200,
        id_token,
        scope: 'mockScope',
        token_type: 'Bearer',
      });

      await expect(handler.handle(response).toPromise()).resolves.toEqual(
        {
          body: {
            access_token: 'mockAccessToken',
            id_token: {
              header,
              payload,
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

    it('should return a response with a decoded access token header and payload when method is POST and upstream returns 200 response and verifyJwk is false', async () => {
      const access_token = await mockedUpstreamJwt();
      const id_token = await mockedUpstreamJwt();

      response.body = JSON.stringify({
        access_token,
        expires_in: 7200,
        id_token,
        scope: 'mockScope',
        token_type: 'Bearer',
      });

      await expect(handler.handle(response).toPromise()).resolves.toEqual(
        {
          body: {
            access_token: {
              header,
              payload,
            },
            id_token: {
              header,
              payload,
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
    it('should return false if no response was provided', async () => {
      await expect(handler.canHandle(undefined).toPromise()).resolves.toEqual(false);
      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);
    });

    it('should return true if a response was provided', async () => {
      await expect(handler.canHandle(response).toPromise()).resolves.toEqual(true);
    });
  });
});
