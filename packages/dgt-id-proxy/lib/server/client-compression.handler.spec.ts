import { brotliCompressSync, deflateSync, gzipSync } from 'zlib';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, lastValueFrom } from 'rxjs';
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

      await expect(() => lastValueFrom(handler.handle(undefined))).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => lastValueFrom(handler.handle(null))).rejects.toThrow('Context cannot be null or undefined');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: null }))).rejects.toThrow('No request was included in the context');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: undefined }))).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request headers are provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: null } }))).rejects.toThrow('No headers were included in the request');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: undefined } }))).rejects.toThrow('No headers were included in the request');

    });

    it('should return an unencoded response if client does not send an accept-encoding header', async () => {

      delete context.request.headers['accept-encoding'];
      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual(response);

    });

    it('should return an unencoded response if client sends accept-encoding header of "compress"', async () => {

      await expect(lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'compress' } } }))).resolves.toEqual(response);

    });

    it('should return a brotli encoded response if client sends accept-encoding header of "compress, br, gzip"', async () => {

      await expect(lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'compress, br, gzip' } } }))).resolves.toEqual({ ...response, body: brotliCompressSync('mockBody') });

    });

    it('should return a gzip encoded response if gzip is first mentioned in the accept-encoding header', async () => {

      await expect(lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'gzip, identity' } } }))).resolves.toEqual({ ...response, body: gzipSync('mockBody') });

    });

    it('should return a deflate encoded response if deflate is first mentioned in the accept-encoding header', async () => {

      await expect(lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'deflate, br, gzip, identity' } } }))).resolves.toEqual({ ...response, body: deflateSync('mockBody') });

    });

    it('should return an unencoded response if identity is first mentioned in the accept-encoding header', async () => {

      await expect(lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'identity, deflate, br, gzip' } } }))).resolves.toEqual({ ...response, body: 'mockBody' });

    });

    it('should handle accept-encoding headers with q-values', async () => {

      await expect(lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: { 'accept-encoding': 'deflate;q=1.0, br;q=1.0, gzip;q=0.8' } } }))).resolves.toEqual({ ...response, body: deflateSync('mockBody') });

    });

    it('should delete the content-encoding header if it exists and the response has no body', async () => {

      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({ status: 200, headers: { 'content-encoding': 'gzip' } }));

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({ status: 200, headers: {} });

    });

  });

  describe('canHandle', () => {

    it('should return false if no context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(undefined))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle(null))).resolves.toEqual(false);

    });

    it('should return false when no context request was provided', async () => {

      await expect(lastValueFrom(handler.canHandle({ ...context, request: null }))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle({ ...context, request: undefined }))).resolves.toEqual(false);

    });

    it('should return false when no context request headers are provided', async () => {

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, headers: null } }))).resolves.toEqual(false);

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, headers: undefined } }))).resolves.toEqual(false);

    });

    it('should return true if correct context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(true);

    });

  });

});
