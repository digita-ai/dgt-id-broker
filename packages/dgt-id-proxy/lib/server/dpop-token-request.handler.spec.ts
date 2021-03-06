import { of, throwError, lastValueFrom } from 'rxjs';
import { HttpHandlerContext, HttpHandler } from '@digita-ai/handlersjs-http';
import { generateKeyPair, exportJWK, JWK, KeyLike, SignJWT } from 'jose';
import { v4 as uuid } from 'uuid';
import * as jose from 'jose';
import { InMemoryStore } from '../storage/in-memory-store';
import { DpopTokenRequestHandler } from './dpop-token-request.handler';

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

describe('DpopTokenRequestHandler', () => {

  let handler: DpopTokenRequestHandler;
  let nestedHandler: HttpHandler;
  let keyValueStore: InMemoryStore<string, string[]>;
  let context: HttpHandlerContext;
  let privateKey: KeyLike;
  let publicJwk: JWK;
  let validDpopJwt: string;
  let dpopJwtWithoutJWK: string;

  const secondsSinceEpoch = () => Math.floor(Date.now() / 1000);

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
        },
      },
      expires_in: 7200,
      scope: '',
      token_type: 'Bearer',
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
      'htu': 'http://localhost:3003/token',
    })
      .setProtectedHeader({
        alg: 'ES256',
        typ: 'dpop+jwt',
        jwk: publicJwk,
      })
      .setJti(uuid())
      .setIssuedAt()
      .sign(privateKey);

    dpopJwtWithoutJWK = await new SignJWT({
      'htm': 'POST',
      'htu': 'http://localhost:3003/token',
    })
      .setProtectedHeader({
        alg: 'ES256',
        typ: 'dpop+jwt',
      })
      .setJti(uuid())
      .setIssuedAt()
      .sign(privateKey);

    context = { request: { headers: { 'dpop': validDpopJwt }, method: 'POST', url: new URL('http://digita.ai/') } };

    nestedHandler = {
      handle: jest.fn(),
      canHandle: jest.fn(),
      safeHandle: jest.fn(),
    };

    keyValueStore = new InMemoryStore();
    handler = new DpopTokenRequestHandler(nestedHandler, keyValueStore, 'http://localhost:3003/token');

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no handler, keyValueStore, or proxyUrl is provided', () => {

    expect(() => new DpopTokenRequestHandler(undefined, keyValueStore, 'http://localhost:3003/token')).toThrow('A HttpHandler must be provided');
    expect(() => new DpopTokenRequestHandler(null, keyValueStore, 'http://localhost:3003/token')).toThrow('A HttpHandler must be provided');
    expect(() => new DpopTokenRequestHandler(nestedHandler, undefined, 'http://localhost:3003/token')).toThrow('A keyValueStore must be provided');
    expect(() => new DpopTokenRequestHandler(nestedHandler, null, 'http://localhost:3003/token')).toThrow('A keyValueStore must be provided');
    expect(() => new DpopTokenRequestHandler(nestedHandler, keyValueStore, undefined)).toThrow('A proxyTokenUrl must be provided');
    expect(() => new DpopTokenRequestHandler(nestedHandler, keyValueStore, null)).toThrow('A proxyTokenUrl must be provided');

  });

  it('should error when clockTolerance is negative', () => {

    expect(() => new DpopTokenRequestHandler(nestedHandler, keyValueStore, 'http://localhost:3003/token', -1)).toThrow('clockTolerance cannot be negative.');

  });

  it('should error when maxDpopProofTokenAge is not greater than 0', () => {

    expect(() => new DpopTokenRequestHandler(nestedHandler, keyValueStore, 'http://localhost:3003/token', 10, 0)).toThrow('maxDpopProofTokenAge must be greater than 0.');
    expect(() => new DpopTokenRequestHandler(nestedHandler, keyValueStore, 'http://localhost:3003/token', 10, -1)).toThrow('maxDpopProofTokenAge must be greater than 0.');

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

    it('should error when no context request method is provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, method: null } }))).rejects.toThrow('No method was included in the request');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, method: undefined } }))).rejects.toThrow('No method was included in the request');

    });

    it('should error when no context request headers are provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: null } }))).rejects.toThrow('No headers were included in the request');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: undefined } }))).rejects.toThrow('No headers were included in the request');

    });

    it('should error when no context request url is provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, url: null } }))).rejects.toThrow('No url was included in the request');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, url: undefined } }))).rejects.toThrow('No url was included in the request');

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

    it('should error when a DPoP proof was issued more than 60 seconds ago by default', async () => {

      const dpopJwt = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt(secondsSinceEpoch() - 71)
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error:'invalid_dpop_proof', error_description:'"iat" claim timestamp check failed (too far in the past)' }),
        headers: { },
        status: 400,
      });

    });

    it('should error when a DPoP proof is issued in the future', async () => {

      const dpopJwt = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt(secondsSinceEpoch() + 15)
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error:'invalid_dpop_proof', error_description: '"iat" claim timestamp check failed (it should be in the past)' }),
        headers: { },
        status: 400,
      });

    });

    it('should tolerate an iat when a DPoP proof is issued upto 10 seconds in the future by default', async () => {

      nestedHandler.handle = jest.fn().mockReturnValue(successfulProxiedServerResponse());

      const dpopJwt = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt(secondsSinceEpoch() + 9)
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual(expect.objectContaining({ status: 200 }));

      const dpopJwt1 = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt(secondsSinceEpoch() + 10)
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt1 };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual(expect.objectContaining({ status: 200 }));

    });

    it('should tolerate an iat depending on the constuctor parameters', async () => {

      nestedHandler.handle = jest.fn().mockReturnValue(successfulProxiedServerResponse());

      const testHandler = new DpopTokenRequestHandler(nestedHandler, keyValueStore, 'http://localhost:3003/token', 30, 90);

      const dpopJwt = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt(secondsSinceEpoch() + 29)
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt };

      await expect(
        lastValueFrom(testHandler.handle(context))
      ).resolves.toEqual(expect.objectContaining({ status: 200 }));

      const dpopJwt1 = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt(secondsSinceEpoch() - 119)
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt1 };

      await expect(
        lastValueFrom(testHandler.handle(context))
      ).resolves.toEqual(expect.objectContaining({ status: 200 }));

    });

    it('should error when a DPoP proof has an unsupported algorithm', async () => {

      const rs384KeyPair = await generateKeyPair('RS384');
      const rs384PublicJwk = await exportJWK(rs384KeyPair.publicKey);

      const dpopJwt = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'RS384',
          typ: 'dpop+jwt',
          jwk: rs384PublicJwk,
        })
        .setJti(uuid())
        .setIssuedAt(secondsSinceEpoch() + 10)
        .sign(rs384KeyPair.privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error:'invalid_dpop_proof', error_description: '"alg" (Algorithm) Header Parameter not allowed' }),
        headers: { },
        status: 400,
      });

    });

    it('should error when a DPoP proof\'s htm value is missing or does not match', async () => {

      const dpopJwtMissingHtm = await new SignJWT({
        'htu': 'http://localhost:3000/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt()
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwtMissingHtm };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'htm does not match the request method' }),
        headers: { },
        status: 400,
      });

      const dpopJwtWrongHtm = await new SignJWT({
        'htm': 'GET',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(uuid())
        .setIssuedAt()
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwtWrongHtm };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'htm does not match the request method' }),
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
      const payload = Buffer.from(JSON.stringify({ htm: 'POST', htu: 'http://localhost:3003/token' })).toString('base64').replace(/=/g, '');

      context.request.headers = { ...context.request.headers, 'dpop': header + '.' + payload + '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: '"jwk" (JSON Web Key) Header Parameter must be a JSON object' }),
        headers: { },
        status: 400,
      });

    });

    it('should error when a DPoP proof\'s jti value is missing', async () => {

      const dpopJwtMissingJti = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setIssuedAt()
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwtMissingJti };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'must have a jti string property' }),
        headers: { },
        status: 400,
      });

    });

    it('should error when a DPoP proof\'s jti is not unique', async () => {

      const repeatUuid = uuid();

      const dpopJwtWithSetJti = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(repeatUuid)
        .setIssuedAt()
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwtWithSetJti };
      nestedHandler.handle = jest.fn().mockReturnValueOnce(successfulProxiedServerResponse());
      // send the jti once
      await lastValueFrom(handler.handle(context));

      // send the jti again
      context.request.headers = { ...context.request.headers, 'dpop': dpopJwtWithSetJti };

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'jti must be unique' }),
        headers: { },
        status: 400,
      });

    });

    it('should add the jti to the "jtis" key in the keyValueStore when none were in the store yet', async () => {

      await expect(keyValueStore.get('jtis')).resolves.toBeUndefined();

      const jti = uuid();

      const dpopJwt = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(jti)
        .setIssuedAt()
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt };
      nestedHandler.handle = jest.fn().mockReturnValueOnce(successfulProxiedServerResponse());
      // send the jti once
      await lastValueFrom(handler.handle(context));

      await expect(keyValueStore.get('jtis')).resolves.toEqual([ jti ]);

    });

    it('should add the jti to the list of jtis in the keyValueStore if there are already jtis in the store', async () => {

      keyValueStore.set('jtis', [ 'mockJti' ]);

      const jti = uuid();

      const dpopJwt = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3003/token',
      })
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: publicJwk,
        })
        .setJti(jti)
        .setIssuedAt()
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt };
      nestedHandler.handle = jest.fn().mockReturnValueOnce(successfulProxiedServerResponse());
      // send the jti once
      await lastValueFrom(handler.handle(context));

      await expect(keyValueStore.get('jtis')).resolves.toEqual([ 'mockJti', jti ]);

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

    it('should return a valid DPoP bound access token response when the upstream server returns a valid response', async () => {

      nestedHandler.handle = jest.fn().mockReturnValueOnce(successfulProxiedServerResponse());
      const resp = await lastValueFrom(handler.handle(context));
      expect(resp.headers).toEqual({});
      expect(resp.status).toEqual(200);

      expect(resp.body.access_token).toBeDefined();
      expect(resp.body.token_type).toEqual('DPoP');
      expect(resp.body.expires_in).toBeDefined();

      expect(resp.body.access_token.payload.cnf).toBeDefined();
      const thumbprint = await jose.calculateJwkThumbprint(publicJwk);
      expect(resp.body.access_token.payload.cnf.jkt).toEqual(thumbprint);

    });

    it('should throw on any errors that are caught in the catchError', async () => {

      nestedHandler.handle = jest.fn().mockReturnValueOnce(throwError(() => new Error('mockError')));
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('mockError');

    });

    it('should throw a falback error if catchError catches an empty error', async () => {

      Object.defineProperty(jose, 'calculateJwkThumbprint', {
        value: jest.fn().mockReturnValueOnce(throwError(() => new Error())),
      });

      nestedHandler.handle = jest.fn().mockReturnValueOnce(successfulProxiedServerResponse());

      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('DPoP verification failed due to an unknown error');

    });

    it('should call calculateJwkThumbprint with an empty object when no JWK was found in the header', async () => {

      Object.defineProperty(jose, 'calculateJwkThumbprint', {
        value: jest.fn().mockReturnValueOnce(throwError(() => new Error())),
      });

      Object.defineProperty(jose, 'jwtVerify', {
        value: jest.fn().mockReturnValueOnce(of(
          { payload: {
            htm: 'POST',
            htu: 'http://localhost:3003/token',
            jti: 'acb869a5-e9ff-462a-b7d3-ccb5470ab239',
            iat: 1624888521,
          },
          protectedHeader: {
            alg: 'ES256',
            typ: 'dpop+jwt',
          } }
        )),
      });

      nestedHandler.handle = jest.fn().mockReturnValueOnce(successfulProxiedServerResponse());

      await expect(lastValueFrom(handler.handle({ ...context, request: { headers: { 'dpop': dpopJwtWithoutJWK }, method: 'POST', url: new URL('http://digita.ai/') } }))).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'no JWK was found in the header' }),
        headers: {},
        status: 400,
      });

    });

  });

  describe('canHandle', () => {

    it('should return false if no context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(undefined))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle(null))).resolves.toEqual(false);

    });

    it('should return false if context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle({ ...context, request: null }))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle({ ...context, request: undefined }))).resolves.toEqual(false);

    });

    it('should return false when no context request method is provided', async () => {

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, method: null } }))).resolves.toEqual(false);

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, method: undefined } }))).resolves.toEqual(false);

    });

    it('should return false when no context request headers are provided', async () => {

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, headers: null } }))).resolves.toEqual(false);

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, headers: undefined } }))).resolves.toEqual(false);

    });

    it('should return false when no context request url is provided', async () => {

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, url: null } }))).resolves.toEqual(false);

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, url: undefined } }))).resolves.toEqual(false);

    });

    it('should return true if correct context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(true);

    });

  });

});
