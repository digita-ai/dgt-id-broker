import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { lastValueFrom } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { Auth0ClientRedirectHandler } from './auth0-client-redirect.handler';

describe('Auth0ClientRedirectHandler', () => {

  let handler: Auth0ClientRedirectHandler;
  let context: HttpHandlerContext;

  let clientStateToClientRedirectUriStore: InMemoryStore<string, string>;
  let upstreamStateToClientStateStore: InMemoryStore<string, string>;

  beforeEach(() => {

    context = { request: { headers: { }, method: 'GET', url: new URL('http://proxy-redirect-uri.com/?state=upstreamState&code=1234') } };
    clientStateToClientRedirectUriStore = new InMemoryStore<string, string>();
    clientStateToClientRedirectUriStore.set('clientState', 'https://client-redirect-uri.com/redirect');
    upstreamStateToClientStateStore = new InMemoryStore<string, string>();
    upstreamStateToClientStateStore.set('upstreamState', 'clientState');

    handler = new Auth0ClientRedirectHandler(clientStateToClientRedirectUriStore, upstreamStateToClientStateStore);

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no clientStateToClientRedirectUriStore or upstreamStateToClientStateStore is provided', () => {

    expect(() => new Auth0ClientRedirectHandler(undefined, upstreamStateToClientStateStore)).toThrow('A clientStateToClientRedirectUriStore must be provided');
    expect(() => new Auth0ClientRedirectHandler(null, upstreamStateToClientStateStore)).toThrow('A clientStateToClientRedirectUriStore must be provided');
    expect(() => new Auth0ClientRedirectHandler(clientStateToClientRedirectUriStore, undefined)).toThrow('A upstreamStateToClientStateStore must be provided');
    expect(() => new Auth0ClientRedirectHandler(clientStateToClientRedirectUriStore, null)).toThrow('A upstreamStateToClientStateStore must be provided');

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

      context.request.url = new URL('https://upstream-redirect-uri.com/?code=1234');
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No state was included in the request');

    });

    it('should error when no code is found in the url', async () => {

      context.request.url = new URL('https://upstream-redirect-uri.com/?state=upstreamState');
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No code was included in the request');

    });

    it('should error when no clientState is found for the provided upstreamState in the upstreamStateToClientStateStore', async () => {

      await upstreamStateToClientStateStore.delete('upstreamState');

      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No clientState was found in the upstreamStateToClientStateStore for the given upstreamState');

    });

    it('should error when no clientState is found for the provided upstreamState in the upstreamStateToClientStateStore', async () => {

      await clientStateToClientRedirectUriStore.delete('clientState');

      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No clientRedirectUri was found in the clientStateToClientRedirectUriStore for the given clientState');

    });

    it('should return a redirect response to the clients redirect uri when the upstreamState and clientRedirectUri are found in the stores', async () => {

      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual({
        headers: { location: 'https://client-redirect-uri.com/redirect?state=clientState&code=1234' },
        status: 302,
      });

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
