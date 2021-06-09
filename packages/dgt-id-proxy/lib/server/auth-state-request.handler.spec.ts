import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { AuthStateRequestHandler } from './auth-state-request.handler';

describe('AuthStateRequestHandler', () => {

  let handler: AuthStateRequestHandler;
  let nestedHandler: HttpHandler;
  let context: HttpHandlerContext;
  let response: HttpHandlerResponse;

  let store: InMemoryStore<string, boolean>;

  beforeEach(() => {

    context = { request: { headers: { }, method: 'GET', url: new URL('http://digita.ai/') } };
    response = { body: 'mockBody', headers: {}, status:200 };
    store = new InMemoryStore<string, boolean>();

    nestedHandler = {
      handle: jest.fn().mockReturnValue(of(response)),
      canHandle: jest.fn(),
      safeHandle: jest.fn(),
    };

    handler = new AuthStateRequestHandler(nestedHandler, store);

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no handler, keyValueStore is provided', () => {

    expect(() => new AuthStateRequestHandler(undefined, store)).toThrow('A HttpHandler must be provided');
    expect(() => new AuthStateRequestHandler(null, store)).toThrow('A HttpHandler must be provided');
    expect(() => new AuthStateRequestHandler(nestedHandler, undefined)).toThrow('A keyValueStore must be provided');
    expect(() => new AuthStateRequestHandler(nestedHandler, null)).toThrow('A keyValueStore must be provided');

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

    it('should add the state to the store with value true when the user sends state', async () => {

      context.request.url = new URL('http://digita.ai/?state=1234');
      await expect(store.get('1234')).resolves.toBeUndefined();

      await expect(handler.handle(context).toPromise()).resolves.toEqual(response);
      await expect(store.get('1234')).resolves.toEqual(true);

    });

    it('should add a generated state to the store with value false when the user does not send state', async () => {

      await expect(handler.handle(context).toPromise()).resolves.toEqual(response);
      const entries = await store.entries();
      const generatedState = await entries.next();
      // entries are stored as an object, { value: [ key, value ], done: value }
      expect(generatedState.done).toEqual(false);

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
