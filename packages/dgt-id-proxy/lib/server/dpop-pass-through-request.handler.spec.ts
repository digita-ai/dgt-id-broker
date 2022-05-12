import { of, throwError, lastValueFrom } from 'rxjs';
import { HttpHandlerContext, HttpHandler } from '@digita-ai/handlersjs-http';
import { generateKeyPair, exportJWK, JWK, KeyLike, SignJWT, calculateJwkThumbprint } from 'jose';
import { v4 as uuid } from 'uuid';
import { DpopPassThroughRequestHandler } from './dpop-pass-through-request.handler';

describe('DpopPassThroughRequestHandler', () => {

  let handler: DpopPassThroughRequestHandler;
  let nestedHandler: HttpHandler;
  let context: HttpHandlerContext;
  let privateKey: KeyLike;
  let publicJwk: JWK;
  let validDpopJwt: string;

  const successfulProxiedServerResponse = () => of({
    body: {
      access_token: {
        header: {
          'alg': 'ES256',
          'typ': 'at+jwt',
          'kid': 'idOfAKey',
        },
        payload: {
          'jti': 'S9ZTuoEOXXIYc0e2JTSzV',
          'sub': '23121d3c-84df-44ac-b458-3d63a9a05497',
          'iat': 1619085373,
          'exp': 1619092573,
          'scope': 'mockScope',
          'client_id': 'mockClient',
          'iss': 'mockIssuer',
          'aud': 'solid',
          'cnf': {
            'jkt': 'mockJkt',
          },
        },
      },
      expires_in: 7200,
      scope: '',
      token_type: 'DPoP',
    },
    headers: {},
    status: 200,
  });

  beforeAll(async () => {

    const keyPair = await generateKeyPair('ES256');
    privateKey = keyPair.privateKey;
    publicJwk = await exportJWK(keyPair.publicKey);

  });

  beforeEach(async () => {

    validDpopJwt = await new SignJWT({
      'htm': 'POST',
      'htu': 'http://proxy.com/token',
    })
      .setProtectedHeader({
        alg: 'ES256',
        typ: 'dpop+jwt',
        jwk: publicJwk,
      })
      .setJti(uuid())
      .setIssuedAt()
      .sign(privateKey);

    context = { request: { headers: { 'dpop': validDpopJwt }, method: 'POST', url: new URL('http://digita.ai/') } };

    nestedHandler = {
      handle: jest.fn(),
    };

    handler = new DpopPassThroughRequestHandler(nestedHandler, 'http://proxy.com/token', 'http://upstream.com/token');

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no handler, proxyTokenUrl or upstreamTokenUrl is provided', () => {

    expect(() => new DpopPassThroughRequestHandler(undefined, 'http://proxy.com/token', 'http://upstream.com/token')).toThrow('A HttpHandler must be provided');
    expect(() => new DpopPassThroughRequestHandler(null, 'http://proxy.com/token', 'http://upstream.com/token')).toThrow('A HttpHandler must be provided');
    expect(() => new DpopPassThroughRequestHandler(nestedHandler, undefined, 'http://upstream.com/token')).toThrow('A proxyTokenUrl must be provided');
    expect(() => new DpopPassThroughRequestHandler(nestedHandler, null, 'http://upstream.com/token')).toThrow('A proxyTokenUrl must be provided');
    expect(() => new DpopPassThroughRequestHandler(nestedHandler, 'http://proxy.com/token', undefined)).toThrow('A upstreamTokenUrl must be provided');
    expect(() => new DpopPassThroughRequestHandler(nestedHandler, 'http://proxy.com/token', null)).toThrow('A upstreamTokenUrl must be provided');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => lastValueFrom(handler.handle(undefined))).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => lastValueFrom(handler.handle(null))).rejects.toThrow('Context cannot be null or undefined');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ... context, request: null }))).rejects.toThrow('No request was included in the context');
      await expect(() => lastValueFrom(handler.handle({ ... context, request: undefined }))).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request headers are provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: null } }))).rejects.toThrow('No headers were included in the request');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: undefined } }))).rejects.toThrow('No headers were included in the request');

    });

    it('should return an error response if context does not include a dpop header', async () => {

      delete context.request.headers.dpop;

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'DPoP header missing on the request.' }),
        headers: { },
        status: 400,
      });

    });

    it('should error when a DPoP proof has an incorrect typ header', async () => {

      const dpopJwt = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'incorrect',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt()
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error:'invalid_dpop_proof', error_description:'unexpected "typ" JWT header value' }),
        headers: { },
        status: 400,
      });

    });

    it('should error when a DPoP proof\'s htu value is missing or does not match', async () => {

      const dpopJwtMissingHtu = await new SignJWT({
        'htm': 'POST',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt()
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwtMissingHtu };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'htu does not match' }),
        headers: { },
        status: 400,
      });

      const dpopJwtWrongHtu = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://thisdoesnotmatch.com/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt()
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwtWrongHtu };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'htu does not match' }),
        headers: { },
        status: 400,
      });

    });

    it('should error when a DPoP proof does not contain a jwk', async () => {

      const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'dpop+jwt' })).toString('base64').replace(/=/g, '');
      const payload = Buffer.from(JSON.stringify({ htm: 'POST', htu: 'http://proxy.com/token' })).toString('base64').replace(/=/g, '');

      context.request.headers = { ...context.request.headers, 'dpop': header + '.' + payload + '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: '"jwk" (JSON Web Key) Header Parameter must be a JSON object' }),
        headers: { },
        status: 400,
      });

    });

    it('should return an error response when the upstream server returns a response with status other than 200', async () => {

      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({
        body: JSON.stringify({ error: 'invalid_request', error_description: 'grant request invalid' }),
        headers: {},
        status: 400,
      }));

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_request', error_description: 'grant request invalid' }),
        headers: {},
        status: 400,
      });

    });

    it('should return a valid DPoP bound access token response with a jkt claim matching the thumbprint of the clients jwk', async () => {

      nestedHandler.handle = jest.fn().mockReturnValueOnce(successfulProxiedServerResponse());
      const resp = await lastValueFrom(handler.handle(context));
      expect(resp.headers).toEqual({});
      expect(resp.status).toEqual(200);

      expect(resp.body.access_token).toBeDefined();
      expect(resp.body.token_type).toEqual('DPoP');
      expect(resp.body.expires_in).toBeDefined();

      expect(resp.body.access_token.payload.cnf).toBeDefined();
      const thumbprint = await calculateJwkThumbprint(publicJwk);
      expect(resp.body.access_token.payload.cnf.jkt).toEqual(thumbprint);

    });

    it('An error thrown in updateDpopResponse should be caught by the catchError and thrown on', async () => {

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const jose = require('jose/jwk/thumbprint');
      jose.calculateJwkThumbprint = jest.fn().mockReturnValueOnce(throwError(() => new Error('mockError')));
      nestedHandler.handle = jest.fn().mockReturnValueOnce(successfulProxiedServerResponse());

      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('mockError');

    });

  });

  describe('canHandle', () => {

    it('should return false if no context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(undefined))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle(null))).resolves.toEqual(false);

    });

    it('should return false if no context request was provided', async () => {

      await expect(lastValueFrom(handler.canHandle({ ...context, request: undefined }))).resolves.toEqual(false);

      await expect(lastValueFrom(handler.canHandle({ ...context, request: null }))).resolves.toEqual(false);

    });

    it('should return false when no context request headers are provided', async () => {

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, headers: undefined } }))).resolves.toEqual(false);

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, headers: null } }))).resolves.toEqual(false);

    });

    it('should return true if correct context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(true);

    });

  });

});
