import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { base64url } from 'jose';
import { lastValueFrom } from 'rxjs';
import { JwtEncodeResponseHandler, JwtField } from './jwt-encode-response.handler';

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

describe('JwtField', () => {

  it('should be correctly instantiated', () => {

    expect(new JwtField('id_token', 'JWT')).toBeTruthy();

  });

});

describe('JwtEncodeResponseHandler', () => {

  let handler: JwtEncodeResponseHandler;
  let proxyUrl: string;
  let response: HttpHandlerResponse;
  let jwtFields: JwtField[];
  let payload: any;
  let header: any;

  beforeEach(() => {

    proxyUrl = 'http://mock-proxy.com';
    jwtFields = [ { field: 'access_token', type: 'at+jwt' } ];
    handler = new JwtEncodeResponseHandler(jwtFields, 'assets/jwks.json', proxyUrl);

    response = {
      body: 'mockbody',
      headers: {},
      status: 200,
    };

    payload = {
      'jti': 'mockJti',
      'sub': 'mockSub',
      'iat': 1619085373,
      'exp': 1619092573,
      'scope': 'mockScope',
      'client_id': 'mockClient',
      'iss': 'http://mock-issuer.com',
      'aud': 'mockAudience',
    };

    header = {
      'mockKey': 'mockValue',
    };

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no proxyUrl or pathToJwks is provided in the constructor', () => {

    expect(() => new JwtEncodeResponseHandler(undefined, 'assets/jwks.json', proxyUrl)).toThrow('jwtFields must be defined and must contain at least 1 field');
    expect(() => new JwtEncodeResponseHandler(null, 'assets/jwks.json', proxyUrl)).toThrow('jwtFields must be defined and must contain at least 1 field');
    expect(() => new JwtEncodeResponseHandler(jwtFields, undefined, proxyUrl)).toThrow('A pathToJwks must be provided');
    expect(() => new JwtEncodeResponseHandler(jwtFields, null, proxyUrl)).toThrow('A pathToJwks must be provided');
    expect(() => new JwtEncodeResponseHandler(jwtFields, 'assets/jwks.json', undefined)).toThrow('A proxyUrl must be provided');
    expect(() => new JwtEncodeResponseHandler(jwtFields, 'assets/jwks.json', null)).toThrow('A proxyUrl must be provided');

  });

  it('should be error when passed an empty list of jwtFields', async () => {

    jwtFields = [];
    await expect(() => new JwtEncodeResponseHandler(jwtFields, 'assets/jwks.json', proxyUrl)).toThrow('jwtFields must be defined and must contain at least 1 field');

  });

  describe('handle', () => {

    it('should error when no response was provided', async () => {

      await expect(() => lastValueFrom(handler.handle(undefined))).rejects.toThrow('response cannot be null or undefined');
      await expect(() => lastValueFrom(handler.handle(null))).rejects.toThrow('response cannot be null or undefined');

    });

    it('should return the response unedited if the status is not 200', async () => {

      response.status = 400;

      await expect(lastValueFrom(handler.handle(response))).resolves.toEqual(response);

    });

    it('should error when the response body does not contain a field that is in the jwtFields list', async () => {

      response.body = { 'id_token': 'mockToken' };

      await expect(() => lastValueFrom(handler.handle(response))).rejects.toThrow('the response body did not include the field "access_token"');

    });

    it('should error when the response body does not contain a payload or header property for a field that is in the jwtFields list', async () => {

      response.body = { 'access_token': 'noPayloadOrHeader' };

      await expect(() => lastValueFrom(handler.handle(response))).rejects.toThrow('the response body did not include a header and payload property for the field "access_token"');

    });

    it('should return an encoded access token when the response has a 200 status and contains an access token', async () => {

      response.body = {
        access_token: {
          header,
          payload,
        },
        id_token: 'mockIdToken',
        expires_in: 7200,
        scope: 'mockScope',
        token_type: 'Bearer',
      };

      const encodedTokenResponse = await lastValueFrom(handler.handle(response));
      const parsedBody = JSON.parse(encodedTokenResponse.body);
      expect(parsedBody.id_token).toEqual('mockIdToken');
      expect(parsedBody.expires_in).toEqual(7200);
      expect(parsedBody.scope).toEqual('mockScope');
      expect(parsedBody.token_type).toEqual('Bearer');

      expect(encodedTokenResponse.headers['content-type']).toEqual('application/json');
      expect(encodedTokenResponse.status).toEqual(200);

      const decodedAccessTokenHeader = JSON.parse(base64url.decode(parsedBody.access_token.split('.')[0]).toString());
      const encodedPayload = JSON.parse(base64url.decode(parsedBody.access_token.split('.')[1]).toString());

      expect(decodedAccessTokenHeader).toEqual({
        alg: 'ES256',
        typ: 'at+jwt',
        kid: 'Eqa03FG9Z7AUQx5iRvpwwnkjAdy-PwmUYKLQFIgSY5E',
      });

      expect(encodedPayload.jti).toBeDefined();
      expect(encodedPayload.iat).toEqual(payload.iat);
      expect(encodedPayload.exp).toEqual(payload.exp);
      expect(encodedPayload.sub).toEqual(payload.sub);
      expect(encodedPayload.scope).toEqual(payload.scope);
      expect(encodedPayload.client_id).toEqual(payload.client_id);
      expect(encodedPayload.iss).toEqual(proxyUrl);
      expect(encodedPayload.aud).toEqual(payload.aud);

    });

  });

  describe('canHandle', () => {

    it('should return false if no response was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(undefined))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle(null))).resolves.toEqual(false);

    });

    it('should return true if a response was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(response))).resolves.toEqual(true);

    });

  });

});
