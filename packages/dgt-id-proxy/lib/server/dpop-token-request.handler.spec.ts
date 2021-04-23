import { of } from 'rxjs';
import { HttpHandlerContext, HttpHandler } from '@digita-ai/handlersjs-http';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { fromKeyLike, JWK, KeyLike } from 'jose/jwk/from_key_like';
import { SignJWT } from 'jose/jwt/sign';
import { v4 as uuid } from 'uuid';
import { InMemoryStore } from '../storage/in-memory-store';
import { DpopTokenRequestHandler } from './dpop-token-request.handler';

describe('DpopTokenRequestHandler', () => {
  let handler: DpopTokenRequestHandler;
  let nestedHandler: HttpHandler;
  let keyValueStore: InMemoryStore<string, string[]>;
  let context: HttpHandlerContext;
  let privateKey: KeyLike;
  let publicJwk: JWK;
  let validDpopJwt: string;

  const secondsSinceEpoch = () => Math.floor(Date.now() / 1000);
  const successfullProxiedServerResponse = () => of({
    body: JSON.stringify({
      access_token: 'eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6ImVtSTNJckZTcHJHMXZQMXRBVWh4emlyOHBDSGJWaUQ2UGxKZFVPM1dldW8ifQ.eyJ3ZWJpZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMi9qYXNwZXJ2YW5kZW5iZXJnaGVuL3Byb2ZpbGUvY2FyZCNtZSIsImp0aSI6IlM5WlR1b0VPWFhJWWMwZTJKVFN6ViIsInN1YiI6IjIzMTIxZDNjLTg0ZGYtNDRhYy1iNDU4LTNkNjNhOWEwNTQ5NyIsImlhdCI6MTYxOTA4NTM3MywiZXhwIjoxNjE5MDkyNTczLCJzY29wZSI6IiIsImNsaWVudF9pZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMi9qYXNwZXJ2YW5kZW5iZXJnaGVuL3Byb2ZpbGUvY2FyZCNtZSIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCIsImF1ZCI6InNvbGlkIn0.d5IatldeFNR7a_9sPatxk3acVEL6NNKfiXwWPJH7Ljx2noEkCWal3p5EJW3OcADB5x2zpy6oeQjgUbVVw_4vsQ',
      expires_in: 7200,
      scope: '',
      token_type: 'Bearer',
    }),
    headers: {},
    status: 200,
  });

  beforeAll(async () => {
    const keyPair = await generateKeyPair('ES256');
    privateKey = keyPair.privateKey;
    publicJwk = await fromKeyLike(keyPair.publicKey);
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
    context = { request: { headers: { 'origin': 'http://localhost', 'dpop': validDpopJwt }, method: 'POST', url: new URL('http://digita.ai/') } };
    nestedHandler = {
      handle: jest.fn(),
      canHandle: jest.fn(),
      safeHandle: jest.fn(),
    };
    keyValueStore = new InMemoryStore();
    handler = new DpopTokenRequestHandler(nestedHandler, keyValueStore, 'assets/jwks.json', 'http://localhost:3003');

  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('should error when no handler, keyValueStore, pathToJwks or proxyUrl is provided', () => {
    expect(() => new DpopTokenRequestHandler(undefined, keyValueStore, 'assets/jwks.json', 'http://localhost:3003')).toThrow('A HttpHandler must be provided');
    expect(() => new DpopTokenRequestHandler(null, keyValueStore, 'assets/jwks.json', 'http://localhost:3003')).toThrow('A HttpHandler must be provided');
    expect(() => new DpopTokenRequestHandler(nestedHandler, undefined, 'assets/jwks.json', 'http://localhost:3003')).toThrow('A keyValueStore must be provided');
    expect(() => new DpopTokenRequestHandler(nestedHandler, null, 'assets/jwks.json', 'http://localhost:3003')).toThrow('A keyValueStore must be provided');
    expect(() => new DpopTokenRequestHandler(nestedHandler, keyValueStore, undefined, 'http://localhost:3003')).toThrow('A pathToJwks must be provided');
    expect(() => new DpopTokenRequestHandler(nestedHandler, keyValueStore, null, 'http://localhost:3003')).toThrow('A pathToJwks must be provided');
    expect(() => new DpopTokenRequestHandler(nestedHandler, keyValueStore, 'assets/jwks.json', undefined)).toThrow('A proxyUrl must be provided');
    expect(() => new DpopTokenRequestHandler(nestedHandler, keyValueStore, 'assets/jwks.json', null)).toThrow('A proxyUrl must be provided');
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

    it('should return an error response if context does not include a dpop header', async () => {
      delete context.request.headers.dpop;
      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'DPoP header missing on the request.' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      });
    });

    it('should error when a jwt has an incorrect typ header', async () => {
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

      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error:'invalid_dpop_proof', error_description:'unexpected "typ" JWT header value' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      });
    });

    it('should error when a jwt was issued more than 60 seconds ago', async () => {
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
        .setIssuedAt(secondsSinceEpoch() - 61)
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt };

      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error:'invalid_dpop_proof', error_description:'"iat" claim timestamp check failed (too far in the past)' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      });
    });

    it('should error when a jwt is issued in the future', async () => {
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
        .setIssuedAt(secondsSinceEpoch() + 10)
        .sign(privateKey);

      context.request.headers = { ...context.request.headers, 'dpop': dpopJwt };

      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error:'invalid_dpop_proof', error_description: '"iat" claim timestamp check failed (it should be in the past)' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      });
    });

    it('should error when a jwt has an unsupported algorithm', async () => {
      const rs384KeyPair = await generateKeyPair('RS384');
      const rs384PublicJwk = await fromKeyLike(rs384KeyPair.publicKey);
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

      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error:'invalid_dpop_proof', error_description: '"alg" (Algorithm) Header Parameter not allowed' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      });
    });

    it('should error when a jwt\'s htm value is missing or does not match', async () => {
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

      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'htm does not match the request method' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
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

      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'htm does not match the request method' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      });
    });

    it('should error when a jwt\'s htu value is missing or does not match', async () => {
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

      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'htu does not match' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
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
      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'htu does not match' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      });
    });

    it('should error when a jwt\'s jti value is missing', async () => {
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

      await expect(handler.handle(context).toPromise()).resolves.toEqual({
        body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'must have a jti string property' }),
        headers: { 'access-control-allow-origin': context.request.headers.origin },
        status: 400,
      });
    });

    // it('should error when a jwt\'s jti is not unique', async () => {
    //   const repeatUuid = uuid();

    //   const dpopJwtWithSetJti = await new SignJWT({
    //     'htm': 'POST',
    //     'htu': 'http://localhost:3003/token',
    //   })
    //     .setProtectedHeader({
    //       alg: 'ES256',
    //       typ: 'dpop+jwt',
    //       jwk: publicJwk,
    //     })
    //     .setJti(repeatUuid)
    //     .setIssuedAt()
    //     .sign(privateKey);

    //   context.request.headers = { ...context.request.headers, 'dpop': dpopJwtWithSetJti };
    //   nestedHandler.handle = jest.fn().mockReturnValueOnce(successfullProxiedServerResponse());
    //   // send the jti once
    //   await handler.handle(context).toPromise();

    //   // send the jti again
    //   context.request.headers = { ...context.request.headers, 'dpop': dpopJwtWithSetJti };
    //   await expect(handler.handle(context).toPromise()).resolves.toEqual({
    //     body: JSON.stringify({ error: 'invalid_dpop_proof', error_description: 'jti must be unique' }),
    //     headers: { 'access-control-allow-origin': context.request.headers.origin },
    //     status: 400,
    //   });
    // });

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

  });

  describe('canHandle', () => {
    it('should return false if no context was provided', async () => {
      await expect(handler.canHandle(undefined).toPromise()).resolves.toEqual(false);
      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);
    });

    it('should return false if context was provided', async () => {
      context.request = undefined;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request = null;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return false when no context request method is provided', async () => {
      context.request.method = null;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request.method = undefined;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return false when no context request headers are provided', async () => {
      context.request.headers = null;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request.headers = undefined;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return false when no context request url is provided', async () => {
      context.request.url = null;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
      context.request.url = undefined;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return true if correct context was provided', async () => {
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(true);
    });
  });

});
