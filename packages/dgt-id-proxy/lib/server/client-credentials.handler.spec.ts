/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { lastValueFrom } from 'rxjs';
import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { PassThroughHttpRequestHandler } from './pass-through-http-request.handler';
import { ClientCredentialsHandler } from './client-credentials.handler';

describe('ClientCredentialsPathHandler', () => {

  const httpHandler = new PassThroughHttpRequestHandler('http://localhost:3003', 3003, 'http:', 'http://localhost:3003/oauth');
  const audience = 'https://audience.com';
  const handler = new ClientCredentialsHandler(httpHandler, audience);
  const context = { request: { headers: { 'accept-encoding': 'gzip' }, method: 'POST', url: new URL('http://localhost:3003/oauth/client') } } as HttpHandlerContext;

  it('should be correctly instantiated', () => {

    expect(handler).toBeDefined();

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(lastValueFrom(handler.handle(undefined as any))).rejects.toThrow('A context must be provided');

    });

    it('should error when no context request is provided', async () => {

      await expect(lastValueFrom(handler.handle({ ... context, request: undefined as any }))).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request url was provided', async () => {

      await expect(lastValueFrom(handler.handle({ ... context, request: { ... context.request, url: undefined as any } }))).rejects.toThrow('No url was included in the request');

    });

    it('should replace the href from client to token endpoint', async () => {

      httpHandler.handle = jest.fn();

      handler.handle(context);

      expect(httpHandler.handle).toHaveBeenCalledTimes(1);
      expect(httpHandler.handle).toHaveBeenCalledWith({ 'request': { 'body': { audience }, 'headers': { 'accept-encoding': 'gzip' }, 'method': 'POST', 'url': new URL('http://localhost:3003/oauth/token') } });

    });

  });

  describe('canHandle', () => {

    it('should return true if correct context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(context))).resolves.toBe(true);

    });

    it('should return false if no context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(undefined as any))).resolves.toBe(false);

    });

    it('should return false when no context request was provided', async () => {

      await expect(lastValueFrom(handler.canHandle({ ... context, request: undefined as any }))).resolves.toBe(false);

    });

    it('should return false when no context request url was provided', async () => {

      await expect(lastValueFrom(handler
        .canHandle({ ... context, request: { ... context.request, url: undefined as any } }))).resolves.toBe(false);

    });

  });

});
