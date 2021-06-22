import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { JwkRequestHandler } from './jwk-request.handler';

jest.mock('fs/promises', () => {

  const testJwks = {
    'keys': [
      {
        'crv': 'P-256',
        'x': 'mockX',
        'y': 'mockY',
        'd': 'mockD',
        'kty': 'EC',
        'kid': 'mockKid1',
        'alg': 'ES256',
        'use': 'sig',
      },
      {
        'key_ops': [ 'mockKeyOps' ],
        'kty': 'RSA',
        'kid': 'mockKid2',
        'alg': 'RS256',
        'use': 'sig',
        'e': 'mockE',
        'n': 'mockN',
        'd': 'mockD',
        'x5c': [ 'mockX5C' ],
      },
    ],
  };

  return {
    readFile: jest.fn().mockResolvedValue(Buffer.from(JSON.stringify(testJwks))),
  };

});

describe('JwkRequestHandler', () => {

  let handler: JwkRequestHandler;
  let context: HttpHandlerContext;

  const publicJwksJson = { 'keys': [
    {
      'crv': 'P-256',
      'x': 'mockX',
      'y': 'mockY',
      'kty': 'EC',
      'kid': 'mockKid1',
      'alg': 'ES256',
      'use': 'sig',
    },
    {
      'key_ops': [ 'mockKeyOps' ],
      'kty': 'RSA',
      'kid': 'mockKid2',
      'alg': 'RS256',
      'use': 'sig',
      'e': 'mockE',
      'n': 'mockN',
      'x5c': [ 'mockX5C' ],
    },
  ] };

  beforeEach(async () => {

    context = { request: { headers: {}, method: 'POST', url: new URL('http://digita.ai/') } };
    handler = new JwkRequestHandler('pathToJwks');

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  describe('handle', () => {

    it('should return a list of keys with only the public claims of the jwks', async () => {

      const resp = await handler.handle(context).toPromise();
      expect(resp.headers).toEqual({ 'Content-Type': 'application/jwk-set+json' });
      expect(resp.status).toEqual(200);
      expect(JSON.parse(resp.body)).toEqual(publicJwksJson);

    });

  });

  describe('canHandle', () => {

    it('should return true for any context', async () => {

      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(true);

    });

  });

});
