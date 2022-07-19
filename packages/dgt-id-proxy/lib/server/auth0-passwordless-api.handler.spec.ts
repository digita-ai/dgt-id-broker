import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { lastValueFrom, of } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryStore } from '../storage/in-memory-store';
import { createErrorResponse } from '../util/error-response-factory';
import { Auth0PasswordlessApiHandler } from './auth0-passwordless-api.handler';

describe('Auth0PasswordlessApiHandler', () => {

  let handler: Auth0PasswordlessApiHandler;
  let nestedHandler: HttpHandler;
  let context: HttpHandlerContext;

  let clientStateToClientRedirectUriStore: InMemoryStore<string, string>;
  let clientSentStateStore: InMemoryStore<string, boolean>;

  const upstreamUrl = 'http://upstream.com/';
  const proxyRedirectUri = 'http://proxy.com/redirect';

  beforeEach(() => {

    context = {
      request: {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        url: new URL('http://proxy.com/passwordless/start'),
        body: {
          'client_id': 'clientId',
          'client_secret': 'secret',
          'connection': 'email',
          'email': 'test@example.com',
          'send': 'link',
          'authParams': {
            'scope': 'openid',
            'response_type': 'code',
            'redirect_uri': 'http://client.com/redirect',
            'state': 'clientState',
          },
        },
      },
    };

    clientStateToClientRedirectUriStore = new InMemoryStore<string, string>();
    clientSentStateStore = new InMemoryStore<string, boolean>();

    nestedHandler = {
      handle: jest.fn(),
    };

    handler = new Auth0PasswordlessApiHandler(
      clientSentStateStore,
      clientStateToClientRedirectUriStore,
      upstreamUrl,
      proxyRedirectUri,
      nestedHandler
    );

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it.each([
    [ 'clientSentStateStore' ],
    [ 'clientStateToClientRedirectUriStore' ],
    [ 'upstreamUrl' ],
    [ 'proxyRedirectUri' ],
    [ 'handler' ],
  ])('should error when $1 is not set', (error) => {

    const items = {
      clientSentStateStore,
      clientStateToClientRedirectUriStore,
      upstreamUrl,
      proxyRedirectUri,
      handler: nestedHandler,
    };

    items[error] = undefined;
    expect(() => new Auth0PasswordlessApiHandler(items.clientSentStateStore, items.clientStateToClientRedirectUriStore, items.upstreamUrl, items.proxyRedirectUri, items.handler)).toThrowError(`A ${error} must be provided`);
    items[error] = null;
    expect(() => new Auth0PasswordlessApiHandler(items.clientSentStateStore, items.clientStateToClientRedirectUriStore, items.upstreamUrl, items.proxyRedirectUri, items.handler)).toThrowError(`A ${error} must be provided`);

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

    it('should return an error response when no "content-type" header is provided or when the "content-type" header is not application/json', async () => {

      context.request.headers = {};
      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual(createErrorResponse(400, 'invalid request', 'the request must include a "content-type" header containing "application/json"'));
      context.request.headers = { 'Content-Type': 'this-is-wrong' };
      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual(createErrorResponse(400, 'invalid request', 'the request must include a "content-type" header containing "application/json"'));

    });

    it('should error when no context request body is provided', async () => {

      context.request.body = null;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No body was included in the request');
      context.request.body = undefined;
      await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No body was included in the request');

    });

    it('should return an error response when no "authParams" is found in the body, or no "redirect_uri" is found in the "authParams"', async () => {

      context.request.body = {};
      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual(createErrorResponse(400, 'invalid request', 'the request must include a "authParams" parameter with a "redirect_uri" parameter'));
      context.request.body = { authParams: {} };
      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual(createErrorResponse(400, 'invalid request', 'the request must include a "authParams" parameter with a "redirect_uri" parameter'));

    });

    it('should set the clients state in the clientSentStateStore if the client sent a state, and set the client sent state with the clients redirect_uri in the clientStateToClientRedirectUriStore', async () => {

      await handler.handle(context);
      await expect(clientSentStateStore.get('clientState')).resolves.toBe(true);
      await expect(clientStateToClientRedirectUriStore.get('clientState')).resolves.toBe('http://client.com/redirect');

    });

    it('should set the generated state clientSentStateStore if the client did not sent a state, and set the generated state with the clients redirect_uri in the clientStateToClientRedirectUriStore', async () => {

      await handler.handle({
        ...context,
        request: {
          ...context.request,
          body: {
            ...context.request.body,
            authParams: {
              ...context.request.body.authParams,
              state: undefined,
            },
          },
        },
      });

      // There will only be one entry, being the generated uuidv4. Get it and check it's value.
      const entry = await clientSentStateStore.entries().next();
      // entry.value returns an array of the entry's key in the first position, and the value in the second position.
      await expect(clientSentStateStore.get(entry.value[0])).resolves.toBe(false);
      await expect(clientStateToClientRedirectUriStore.get(entry.value[0])).resolves.toBe('http://client.com/redirect');

    });

    it('should replace the clients redirect_uri with the proxyRedirectUri, add the audience parameter, and add the generated state if the client did not send a state to the body', async () => {

      await handler.handle({
        ...context,
        request: {
          ...context.request,
          body: {
            ...context.request.body,
            authParams: {
              ...context.request.body.authParams,
              state: undefined,
            },
          },
        },
      });

      const entry = await clientSentStateStore.entries().next();

      expect(nestedHandler.handle).toHaveBeenCalledWith({
        ...context,
        request: {
          ...context.request,
          body: {
            ...context.request.body,
            authParams: {
              ...context.request.body.authParams,
              redirect_uri: proxyRedirectUri,
              audience: 'http://upstream.com/api/v2/',
              state: entry.value[0],
            },
          },
        },
      });

    });

    it('should replace the clients redirect_uri with the proxyRedirectUri, add the audience parameter, and keep the clients state if the client sent state to the body', async () => {

      await handler.handle(context);

      expect(nestedHandler.handle).toHaveBeenCalledWith({
        ...context,
        request: {
          ...context.request,
          body: {
            ...context.request.body,
            authParams: {
              ...context.request.body.authParams,
              redirect_uri: proxyRedirectUri,
              audience: 'http://upstream.com/api/v2/',
              state: 'clientState',
            },
          },
        },
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

      context.request.body = null;
      await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);
      context.request.body = undefined;
      await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(false);

    });

    it('should return true if correct context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(true);

    });

  });

});
