import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { KeyValueStore } from '../storage/key-value-store';
import { InMemoryStore } from '../storage/in-memory-store';
import { SolidClientStaticRegistrationHandler } from './solid-client-static-registration.handler';

describe('SolidClientStaticRegistrationHandler', () => {
  let solidClientStaticRegistrationHandler: SolidClientStaticRegistrationHandler;
  let context: HttpHandlerContext;
  let httpHandler: HttpHandler;
  const clientID = 'http://localhost:3002/jaspervandenberghen/profile/card#me';
  let store: KeyValueStore<string, string>;

  beforeEach(async () => {
    httpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValueOnce(of()),
      safeHandle: jest.fn(),
    } as HttpHandler;

    store = new InMemoryStore();
    solidClientStaticRegistrationHandler = new SolidClientStaticRegistrationHandler(clientID, store, httpHandler);

    const url = new URL(`http://example.com:3001/reg`);

    context = { request: { headers: {}, body: {}, method: 'POST', url } };
  });

  it('should be correctly instantiated', () => {
    expect(solidClientStaticRegistrationHandler).toBeTruthy();
  });

  it('should error when no handler was provided', () => {
    expect(() => new SolidClientStaticRegistrationHandler(clientID, store, undefined)).toThrow('No handler was provided');
    expect(() => new SolidClientStaticRegistrationHandler(clientID, store, null)).toThrow('No handler was provided');
  });

  it('should error when no clientID was provided', () => {
    expect(() => new SolidClientStaticRegistrationHandler(undefined, store, httpHandler)).toThrow('No clientID was provided');
    expect(() => new SolidClientStaticRegistrationHandler(null, store, httpHandler)).toThrow('No clientID was provided');
  });

  it('should error when no store was provided', () => {
    expect(() => new SolidClientStaticRegistrationHandler(clientID, undefined, httpHandler)).toThrow('No store was provided');
    expect(() => new SolidClientStaticRegistrationHandler(clientID, null, httpHandler)).toThrow('No store was provided');
  });

  describe('handle', () => {
    it('should error when no context was provided', async () => {
      await expect(() => solidClientStaticRegistrationHandler.handle(undefined).toPromise()).rejects.toThrow('A context must be provided');
      await expect(() => solidClientStaticRegistrationHandler.handle(null).toPromise()).rejects.toThrow('A context must be provided');
    });

    it('should error when no context request is provided', async () => {
      context.request = null;
      await expect(() => solidClientStaticRegistrationHandler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
      context.request = undefined;
      await expect(() => solidClientStaticRegistrationHandler.handle(context).toPromise()).rejects.toThrow('No request was included in the context');
    });

    it('should error when no context request body is provided', async () => {
      context.request.body = null;
      await expect(() => solidClientStaticRegistrationHandler.handle(context).toPromise()).rejects.toThrow('No body was included in the request');
      context.request.body = undefined;
      await expect(() => solidClientStaticRegistrationHandler.handle(context).toPromise()).rejects.toThrow('No body was included in the request');
    });
  });
});
