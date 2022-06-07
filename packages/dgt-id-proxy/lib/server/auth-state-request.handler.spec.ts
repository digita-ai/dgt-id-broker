import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { lastValueFrom } from 'rxjs';
import { MemoryStore } from '@digita-ai/handlersjs-storage';
import { AuthStateRequestHandler } from './auth-state-request.handler';

describe('AuthStateRequestHandler', () => {

  let handler: AuthStateRequestHandler;
  let context: HttpHandlerContext;

  let store: MemoryStore<{ [key: string]: boolean }>;

  beforeEach(() => {

    context = { request: { headers: { }, method: 'GET', url: new URL('http://digita.ai/') } };
    store = new MemoryStore<{ [key: string]: boolean }>();

    handler = new AuthStateRequestHandler(store);

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no keyValueStore is provided', () => {

    expect(() => new AuthStateRequestHandler(undefined)).toThrow('A keyValueStore must be provided');
    expect(() => new AuthStateRequestHandler(null)).toThrow('A keyValueStore must be provided');

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

    it('should add the state to the store with value true when the user sends state', async () => {

      context.request.url = new URL('http://digita.ai/?state=1234');
      await expect(store.get('1234')).resolves.toBeUndefined();

      await lastValueFrom(handler.handle(context));
      await expect(store.get('1234')).resolves.toEqual(true);

    });

    it('should add a generated state to the store with value false when the user does not send state and add state to the url', async () => {

      await lastValueFrom(handler.handle(context));
      const entries = await store.entries();
      const generatedState = await entries.next();

      expect(context.request.url.searchParams.has('state')).toEqual(true);
      // entries are stored as an object, { value: [ key, value ], done: value }
      expect(generatedState.done).toEqual(false);

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
