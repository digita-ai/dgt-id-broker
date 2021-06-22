import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { JwkRequestHandler } from './jwk-request.handler';

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

describe('JwkRequestHandler', () => {

  let handler: JwkRequestHandler;
  let context: HttpHandlerContext;

  const publicJwksJson = { 'keys': [
    {
      'crv': 'P-256',
      'x': 'ZXD5luOOClkYI-WieNfw7WGISxIPjH_PWrtvDZRZsf0',
      'y': 'vshKz414TtqkkM7gNXKqawrszn44OTSR_j-JxP-BlWo',
      'kty': 'EC',
      'kid': 'Eqa03FG9Z7AUQx5iRvpwwnkjAdy-PwmUYKLQFIgSY5E',
      'alg': 'ES256',
      'use': 'sig',
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
