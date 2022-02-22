import { async, lastValueFrom } from 'rxjs';
import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { PassThroughHttpRequestHandler } from './pass-through-http-request.handler';
import { ClientCredentialsPathHandler } from './client-credentials-path.handler';

describe('ClientCredentialsPathHandler', () => {

  const httpHandler: PassThroughHttpRequestHandler = new PassThroughHttpRequestHandler('http://localhost:8080', 8080, 'http:', 'http://localhost:8080/oauth');
  const handler: ClientCredentialsPathHandler = new ClientCredentialsPathHandler(httpHandler);
  const context: HttpHandlerContext = { request: { headers: { 'accept-encoding': 'gzip' }, method: 'POST', url: new URL('http://localhost:8080/oauth/client') } };

  it('should be correctly instantiated', () => {

    expect(handler).toBeDefined();

  });

  it('should error when no handler is provided', () => {

    expect(() => new ClientCredentialsPathHandler(undefined)).toThrow('A HttpHandler must be provided');
    expect(() => new ClientCredentialsPathHandler(null)).toThrow('A HttpHandler must be provided');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => lastValueFrom(handler.handle(undefined))).rejects.toThrow('A context must be provided');
      await expect(() => lastValueFrom(handler.handle(null))).rejects.toThrow('A context must be provided');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: null }))).rejects.toThrow('No request was included in the context');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: undefined }))).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request url was provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, url: null } }))).rejects.toThrow('No url was included in the request');
      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, url: undefined } }))).rejects.toThrow('No url was included in the request');

    });

    it('should replace the href from client to token endpoint', async () => {

      httpHandler.handle = jest.fn();

      handler.handle(context);

      expect(httpHandler.handle).toHaveBeenCalledTimes(1);
      expect(httpHandler.handle).toHaveBeenCalledWith({ 'request': { 'headers': { 'accept-encoding': 'gzip' }, 'method': 'POST', 'url': new URL('http://localhost:8080/oauth/token') } });

    });

  });

  describe('canHandle', () => {

    it('should return true if correct context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(true);

    });

    it('should return false if no context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(undefined))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle(null))).resolves.toEqual(false);

    });

    it('should return false when no context request was provided', async () => {

      await expect(lastValueFrom(handler.canHandle({ ...context, request: null }))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle({ ...context, request: undefined }))).resolves.toEqual(false);

    });

    it('should return false when no context request url was provided', async () => {

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, url: null } }))).resolves.toEqual(false);

      await expect(lastValueFrom(handler
        .canHandle({ ...context, request: { ...context.request, url: undefined } }))).resolves.toEqual(false);

    });

  });

});
