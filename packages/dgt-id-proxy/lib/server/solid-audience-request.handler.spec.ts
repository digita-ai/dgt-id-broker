import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { SignJWT } from 'jose/jwt/sign';
import { decode } from 'jose/util/base64url';
import { SolidAudienceRequestHandler } from './solid-audience-request.handler';

describe('SolidAudienceRequestHandler', () => {
  let handler: SolidAudienceRequestHandler;
  let nestedHandler: HttpHandler;
  let context: HttpHandlerContext;

  const mockedAccessToken = async (aud) => {
    const keyPair = await generateKeyPair('ES256');

    return new SignJWT(
      {
        jti: '49c1b4e1-3747-413b-932f-25668f934fb9',
        sub: '23121d3c-84df-44ac-b458-3d63a9a05497',
        scope: '',
        client_id: 'client',
        iss: 'http://localhost:3000',
        aud,
      },
    )
      .setProtectedHeader({ alg: 'ES256', kid: 'keyid', typ: 'at+jwt'  })
      .setIssuedAt()
      .setExpirationTime(7200)
      .sign(keyPair.privateKey);
  };

  beforeEach(() => {
    nestedHandler = {
      handle: jest.fn(),
      canHandle: jest.fn(),
      safeHandle: jest.fn(),
    };
    handler = new SolidAudienceRequestHandler(nestedHandler, 'assets/jwks.json', 'http://localhost:3003');
    context = { request: { headers: { 'origin': 'http://localhost' }, method: 'POST', url: new URL('http://digita.ai/') } };
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('should error when no handler or proxyUrl is provided in the constructor', () => {
    expect(() => new SolidAudienceRequestHandler(undefined, 'assets/jwks.json', 'http://localhost:3003')).toThrow('A handler must be provided');
    expect(() => new SolidAudienceRequestHandler(null, 'assets/jwks.json', 'http://localhost:3003')).toThrow('A handler must be provided');
    expect(() => new SolidAudienceRequestHandler(nestedHandler, undefined, 'http://localhost:3003')).toThrow('A pathToJwks must be provided');
    expect(() => new SolidAudienceRequestHandler(nestedHandler, null, 'http://localhost:3003')).toThrow('A pathToJwks must be provided');
    expect(() => new SolidAudienceRequestHandler(nestedHandler, 'assets/jwks.json', undefined)).toThrow('A proxyUrl must be provided');
    expect(() => new SolidAudienceRequestHandler(nestedHandler, 'assets/jwks.json', null)).toThrow('A proxyUrl must be provided');

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

    it('should error when method is not OPTIONS or POST', async () => {
      context.request.method = 'GET';
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('this method is not supported.');
    });

    it('should return the response of the nestedHandler unedited when method is OPTIONS', async () => {
      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({ body: 'options', headers: {}, status: 200 }));
      context.request.method = 'OPTIONS';
      await expect(handler.handle(context).toPromise()).resolves.toEqual({ body: 'options', headers: {}, status: 200 });
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

    // NOTE: This test is commented out because it does not pass the git commit hook. @woutermont is aware of this issue.
    // The handler requires a relative path to a file containing jwks. The git commit hook runs the tests from the root,
    // so the relative path is searched from the root, but it should be searched from the dgt-id-proxy.
    // The tests pass when running npm run test from the dgt-id-proxy directory.

    it('should return a token with the issuer set to the proxy and an aud array containing solid', async () => {
      // mocked response with audience as a string (single item)
      const token1 = await mockedAccessToken('client');
      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({
        body: JSON.stringify({
          access_token: token1,
          expires_in: 7200,
          scope: '',
          token_type: 'Bearer',
        }),
        headers: {},
        status: 200,
      }));
      const resp1 = await handler.handle(context).toPromise();
      expect(resp1.status).toEqual(200);

      const parsedBody1 = JSON.parse(resp1.body);
      expect(parsedBody1.access_token).toBeDefined();

      const tokenPayload1 = JSON.parse(decode(parsedBody1.access_token.split('.')[1]).toString());
      expect(tokenPayload1.iss).toEqual('http://localhost:3003');
      expect(tokenPayload1.aud).toEqual([ 'client', 'solid' ]);

      // mocked response with audience as an array
      const token2 = await mockedAccessToken([ 'client', 'audience' ]);
      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({
        body: JSON.stringify({
          access_token: token2,
          expires_in: 7200,
          scope: '',
          token_type: 'Bearer',
        }),
        headers: {},
        status: 200,
      }));
      const resp2 = await handler.handle(context).toPromise();
      expect(resp2.status).toEqual(200);

      const parsedBody2 = JSON.parse(resp2.body);
      expect(parsedBody2.access_token).toBeDefined();

      const tokenPayload2 = JSON.parse(decode(parsedBody2.access_token.split('.')[1]).toString());
      expect(tokenPayload2.iss).toEqual('http://localhost:3003');
      expect(tokenPayload2.aud).toEqual([ 'client', 'audience', 'solid' ]);
    });

  });
});
