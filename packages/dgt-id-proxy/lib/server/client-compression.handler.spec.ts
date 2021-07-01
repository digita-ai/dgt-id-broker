import { brotliCompressSync, deflateSync, gzipSync } from 'zlib';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { ClientCompressionHandler } from './client-compression.handler';

describe('ClientCompressionHandler', () => {

  let handler: ClientCompressionHandler;
  let nestedHandler: HttpHandler;
  let context: HttpHandlerContext;
  let response: HttpHandlerResponse;

  beforeEach(() => {

    response = {
      body: 'mockBody',
      headers: {},
      status: 200,
    };

    nestedHandler = {
      handle: jest.fn().mockReturnValue(of(response)),
      canHandle: jest.fn(),
      safeHandle: jest.fn(),
    };

    handler = new ClientCompressionHandler(nestedHandler);
    context = { request: { headers: { 'accept-encoding': 'gzip' }, method: 'POST', url: new URL('http://digita.ai/') } };

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no handler is provided', () => {

    expect(() => new ClientCompressionHandler(undefined)).toThrow('A HttpHandler must be provided');
    expect(() => new ClientCompressionHandler(null)).toThrow('A HttpHandler must be provided');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => handler.handle(undefined).toPromise()).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => handler.handle(null).toPromise()).rejects.toThrow('Context cannot be null or undefined');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => handler.handle({ ...context, request: null }).toPromise()).rejects.toThrow('No request was included in the context');
      await expect(() => handler.handle({ ...context, request: undefined }).toPromise()).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request headers are provided', async () => {

      await expect(() => handler.handle({ ...context, request: { ...context.request, headers: null } }).toPromise()).rejects.toThrow('No headers were included in the request');
      await expect(() => handler.handle({ ...context, request: { ...context.request, headers: undefined } }).toPromise()).rejects.toThrow('No headers were included in the request');

    });

    it('should return an unencoded response if client does not send an accept-encoding header', async () => {

      delete context.request.headers['accept-encoding'];
      await expect(handler.handle(context).toPromise()).resolves.toEqual(response);

    });

    it('should return an unencoded response if client sends accept-encoding header of "compress"', async () => {

      await expect(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'compress' } } }).toPromise()).resolves.toEqual(response);

    });

    it('should return a brotli encoded response if client sends accept-encoding header of "compress, br, gzip"', async () => {

      await expect(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'compress, br, gzip' } } })
        .toPromise()).resolves.toEqual({ ...response, body: brotliCompressSync('mockBody') });

    });

    it('should return a gzip encoded response if gzip is first mentioned in the accept-encoding header', async () => {

      await expect(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'gzip, identity' } } })
        .toPromise()).resolves.toEqual({ ...response, body: gzipSync('mockBody') });

    });

    it('should return a deflate encoded response if deflate is first mentioned in the accept-encoding header', async () => {

      await expect(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'deflate, br, gzip, identity' } } })
        .toPromise()).resolves.toEqual({ ...response, body: deflateSync('mockBody') });

    });

    it('should return an unencoded response if identity is first mentioned in the accept-encoding header', async () => {

      await expect(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'identity, deflate, br, gzip' } } })
        .toPromise()).resolves.toEqual({ ...response, body: 'mockBody' });

    });

    it('should handle accept-encoding headers with q-values', async () => {

      await expect(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'deflate;q=1.0, br;q=1.0, gzip;q=0.8' } } })
        .toPromise()).resolves.toEqual({ ...response, body: deflateSync('mockBody') });

    });

  });

  describe('canHandle', () => {

    it('should return false if no context was provided', async () => {

      await expect(handler.canHandle(undefined).toPromise()).resolves.toEqual(false);
      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);

    });

    it('should return false when no context request was provided', async () => {

      await expect(handler.canHandle({ ...context, request: null }).toPromise()).resolves.toEqual(false);
      await expect(handler.canHandle({ ...context, request: undefined }).toPromise()).resolves.toEqual(false);

    });

    it('should return false when no context request headers are provided', async () => {

      await expect(handler.canHandle({ ...context, request: { ...context.request, headers: null } })
        .toPromise()).resolves.toEqual(false);

      await expect(handler.canHandle({ ...context, request: { ...context.request, headers: undefined } })
        .toPromise()).resolves.toEqual(false);

    });

    it('should return true if correct context was provided', async () => {

      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(true);

    });

  });

});
