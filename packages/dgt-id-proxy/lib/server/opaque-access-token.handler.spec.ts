import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
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
  let response: HttpHandlerResponse;

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
      .setExpirationTime('2h')
      .sign(keyPair.privateKey);
  };

  beforeEach(() => {
    handler = new OpaqueAccessTokenHandler();
    response = {
      body: 'mockbody',
      headers: {},
      status: 200,
    };
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  describe('handle', () => {
    it('should error when no response was provided', async () => {
      await expect(() => handler.handle(undefined).toPromise()).rejects.toThrow('response cannot be null or undefined');
      await expect(() => handler.handle(null).toPromise()).rejects.toThrow('response cannot be null or undefined');
    });

    it('should return the response unedited when the upstream server returns a response with status other than 200', async () => {
      response.status = 400;

      await expect(handler.handle(response).toPromise()).resolves.toEqual(response);
    });

    it('should return a token with the issuer set to the proxy and the aud, sub, iat and exp claims of the id token. Header typ should be "at+jwt"', async () => {
      // mocked response with audience as a string (single item)
      const idToken = await mockedIdToken();
      response.body = JSON.stringify({
        access_token: 'opaqueaccesstoken',
        id_token: idToken,
        expires_in: 7200,
        scope: '',
        token_type: 'Bearer',
      });
      const decodedIdTokenPayload = JSON.parse(decode(idToken.split('.')[1]).toString());

      const resp = await handler.handle(response).toPromise();
      expect(resp.status).toEqual(200);

      expect(resp.body.access_token).toBeDefined();
      expect(resp.body.access_token.payload.aud).toEqual(decodedIdTokenPayload.aud);
      expect(resp.body.access_token.payload.sub).toEqual(decodedIdTokenPayload.sub);
      expect(resp.body.access_token.payload.iat).toEqual(decodedIdTokenPayload.iat);
      expect(resp.body.access_token.payload.exp).toEqual(decodedIdTokenPayload.exp);
      expect(resp.body.access_token.payload.client_id).toEqual(decodedIdTokenPayload.aud);

    });

    describe('canHandle', () => {
      it('should return false if no response was provided', async () => {
        await expect(handler.canHandle(undefined).toPromise()).resolves.toEqual(false);
        await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);
      });

      it('should return true if correct response was provided', async () => {
        await expect(handler.canHandle(response).toPromise()).resolves.toEqual(true);
      });
    });
  });
});
