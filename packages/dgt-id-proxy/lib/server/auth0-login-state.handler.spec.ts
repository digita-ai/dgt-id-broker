import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { lastValueFrom, of } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { Auth0LoginStateHandler } from './auth0-login-state.handler';

describe('Auth0LoginStateHandler', () => {

  let handler: Auth0LoginStateHandler;
  let nestedHandler: HttpHandler;
  let context: HttpHandlerContext;

  let clientStateToClientRedirectUriStore: InMemoryStore<string, string>;
  let upstreamStateToClientStateStore: InMemoryStore<string, string>;

  let upstreamResponse: HttpHandlerResponse;

  beforeEach(() => {

    context = { request: { headers: { }, method: 'GET', url: new URL('http://proxy.com/?state=clientState&redirect_uri=https%3A%2F%2Fclient-redirect-uri.com%2Fredirect') } };
    clientStateToClientRedirectUriStore = new InMemoryStore<string, string>();
    upstreamStateToClientStateStore = new InMemoryStore<string, string>();

    upstreamResponse = {
      headers: { location: 'https://upstream.com/endpoint?state=upstreamState' },
      status: 302,
    };

    nestedHandler = {
      handle: jest.fn().mockReturnValue(of(upstreamResponse)),
    };

    handler = new Auth0LoginStateHandler(
      clientStateToClientRedirectUriStore,
      upstreamStateToClientStateStore,
      nestedHandler
    );

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it.each([
    [ 'clientStateToClientRedirectUriStore' ],
    [ 'upstreamStateToClientStateStore' ],
    [ 'handler' ],
  ])('should error when $1 is not set', (error) => {

    const items = { clientStateToClientRedirectUriStore, upstreamStateToClientStateStore, handler: nestedHandler };

    items[error] = undefined;
    expect(() => new Auth0LoginStateHandler(items.clientStateToClientRedirectUriStore, items.upstreamStateToClientStateStore, items.handler)).toThrow(`A ${error} must be provided`);
    items[error] = null;
    expect(() => new Auth0LoginStateHandler(items.clientStateToClientRedirectUriStore, items.upstreamStateToClientStateStore, items.handler)).toThrow(`A ${error} must be provided`);

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

    it('should error when no state is found in the url', async () => {

      context.request.url = new URL('https://upstream-redirect-uri.com/?redirect_uri=https%3A%2F%2Fclient-redirect-uri.com%2Fredirect');
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No state was included in the request');

    });

    it('should error when no redirect_uri is found in the url', async () => {

      context.request.url = new URL('https://upstream-redirect-uri.com/?state=upstreamState');
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No redirect_uri was included in the request');

    });

    it('should error when no upstreamState is found in the location header of the response', async () => {

      nestedHandler.handle = jest.fn().mockReturnValueOnce(of({ ...upstreamResponse, headers: { location: 'https://upstream.com/endpoint' } }));

      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No upstreamState was included in the response');

    });

    it('should save the client state and client redirect uri in the clientStateToClientRedirectUriStore, save the upstream state and the client state in the upstreamStateToClientStateStore, and return the upstream response as is when all the expected parameters are included in the request', async () => {

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual(upstreamResponse);
      await expect(clientStateToClientRedirectUriStore.get('clientState')).resolves.toEqual('https://client-redirect-uri.com/redirect');
      await expect(upstreamStateToClientStateStore.get('upstreamState')).resolves.toEqual('clientState');

    });

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

    it('should return true if correct context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(true);

    });

  });

});
