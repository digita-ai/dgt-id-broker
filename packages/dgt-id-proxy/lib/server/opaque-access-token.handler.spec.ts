import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of, lastValueFrom } from 'rxjs';
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

  const response = {
    body: 'mockBody',
    headers: {},
    status: 200,
  };

  beforeEach(() => {

    nestedHandler = {
      handle: jest.fn(),
    };

    handler = new OpaqueAccessTokenHandler(nestedHandler);
    context = { request: { headers: {}, method: 'POST', url: new URL('http://digita.ai/'), body: 'client_id=mockClient' } };

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no handler is provided', () => {

    expect(() => new OpaqueAccessTokenHandler(undefined)).toThrow('handler must be defined');
    expect(() => new OpaqueAccessTokenHandler(null)).toThrow('handler must be defined');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => lastValueFrom(handler.handle(undefined))).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => lastValueFrom(handler.handle(null))).rejects.toThrow('Context cannot be null or undefined');

    });

    it('should error when no context request is provided', async () => {

      context.request = null;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No request was included in the context');
      context.request = undefined;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request method is provided', async () => {

      context.request.method = null;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No method was included in the request');
      context.request.method = undefined;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No method was included in the request');

    });

    it('should error when no context request headers are provided', async () => {

      context.request.headers = null;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No headers were included in the request');
      context.request.headers = undefined;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No headers were included in the request');

    });

    it('should error when no context request url is provided', async () => {

      context.request.url = null;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No url was included in the request');
      context.request.url = undefined;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No url was included in the request');

    });

    it('should error when no context request body is provided', async () => {

      context.request.body = null;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No body was included in the request');
      context.request.body = undefined;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No body was included in the request');

    });

    it('should error when no request body does not contain a client_id is provided', async () => {

      context.request.body = 'noClientId';
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('Request body must contain a client_id claim');

    });

    it('should return an error response when the upstream server returns a response with status other than 200', async () => {

      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({
        ...response,
        body: JSON.stringify({ error: 'invalid_request', error_description: 'grant request invalid' }),
        status: 400,
      }));

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        ...response,
        body: JSON.stringify({ error: 'invalid_request', error_description: 'grant request invalid' }),
        status: 400,
      });

    });

    it('should error when the response body is not JSON or does not contain an id_token property', async () => {

      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({
        ...response,
        body: 'notJSON',
      }));

      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('response body must be JSON and must contain an id_token');

      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({
        ...response,
        body: { mockKey: 'mockValue' },
      }));

      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('response body must be JSON and must contain an id_token');

    });

    it('should return a token with the issuer set to the proxy and the aud, sub, iat and exp claims of the id token', async () => {

      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({
        ...response,
        body: {
          access_token: 'opaqueaccesstoken',
          id_token: {
            header: {},
            payload: {
              sub: '23121d3c-84df-44ac-b458-3d63a9a05497',
              iat: 1619085373,
              exp: 1619092573,
              aud: 'mockClient',
            },
          },
          expires_in: 7200,
          scope: '',
          token_type: 'Bearer',
        },
      }));

      const resp = await lastValueFrom(handler.handle(context));
      expect(resp.status).toEqual(200);

      expect(resp.body.access_token).toBeDefined();
      expect(resp.body.access_token.payload.aud).toEqual('mockClient');
      expect(resp.body.access_token.payload.sub).toEqual('23121d3c-84df-44ac-b458-3d63a9a05497');
      expect(resp.body.access_token.payload.iat).toEqual(1619085373);
      expect(resp.body.access_token.payload.exp).toEqual(1619092573);
      expect(resp.body.access_token.payload.client_id).toEqual('mockClient');

    });

    describe('canHandle', () => {

      it('should return false if no context was provided', async () => {

        await expect(lastValueFrom(handler.canHandle(undefined))).resolves.toEqual(false);
        await expect(lastValueFrom(handler.canHandle(null))).resolves.toEqual(false);

      });

      it('should return false if context was provided', async () => {

        context.request = undefined;
        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);
        context.request = null;
        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);

      });

      it('should return false when no context request method is provided', async () => {

        context.request.method = null;
        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);
        context.request.method = undefined;
        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);

      });

      it('should return false when no context request headers are provided', async () => {

        context.request.headers = null;
        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);
        context.request.headers = undefined;
        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);

      });

      it('should return false when no context request url is provided', async () => {

        context.request.url = null;
        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);
        context.request.url = undefined;
        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);

      });

      it('should return false when no context request body is provided', async () => {

        context.request.body = null;
        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);
        context.request.body = undefined;
        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);

      });

      it('should return true if correct context was provided', async () => {

        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(true);

      });

    });

  });

});
