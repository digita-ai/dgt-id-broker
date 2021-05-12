import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { KeyValueStore } from '../storage/key-value-store';
import { InMemoryStore } from '../storage/in-memory-store';
import { SolidClientStaticAuthRegistrationHandler } from './solid-client-static-auth-registration.handler';

describe('SolidClientStaticAuthRegistrationHandler', () => {

  const httpHandler = {
    canHandle: jest.fn(),
    handle: jest.fn().mockReturnValueOnce(of()),
    safeHandle: jest.fn(),
  } as HttpHandler;

  const clientID = 'http://localhost:3002/jaspervandenberghen/profile/card#me';
  const url = new URL(`http://example.com:3001/reg`);
  const store: KeyValueStore<string, string> = new InMemoryStore();

  const solidClientStaticAuthRegistrationHandler = new SolidClientStaticAuthRegistrationHandler(
    clientID,
    store,
    httpHandler
  );

  const context = { request: { headers: {}, body: {}, method: 'POST', url } } as HttpHandlerContext;

  it('should be correctly instantiated', () => {

    expect(solidClientStaticAuthRegistrationHandler).toBeTruthy();

  });

  it('should error when no handler was provided', () => {

    expect(() => new SolidClientStaticAuthRegistrationHandler(clientID, store, undefined)).toThrow('No handler was provided');
    expect(() => new SolidClientStaticAuthRegistrationHandler(clientID, store, null)).toThrow('No handler was provided');

  });

  it('should error when no clientID was provided', () => {

    expect(() => new SolidClientStaticAuthRegistrationHandler(undefined, store, httpHandler)).toThrow('No clientID was provided');
    expect(() => new SolidClientStaticAuthRegistrationHandler(null, store, httpHandler)).toThrow('No clientID was provided');

  });

  it('should error when no store was provided', () => {

    expect(() => new SolidClientStaticAuthRegistrationHandler(clientID, undefined, httpHandler)).toThrow('No store was provided');
    expect(() => new SolidClientStaticAuthRegistrationHandler(clientID, null, httpHandler)).toThrow('No store was provided');

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => solidClientStaticAuthRegistrationHandler.handle(undefined).toPromise()).rejects.toThrow('A context must be provided');
      await expect(() => solidClientStaticAuthRegistrationHandler.handle(null).toPromise()).rejects.toThrow('A context must be provided');

    });

    it('should error when no context request is provided', async () => {

      await expect(() => solidClientStaticAuthRegistrationHandler.handle({ ...context, request: null }).toPromise()).rejects.toThrow('No request was included in the context');
      await expect(() => solidClientStaticAuthRegistrationHandler.handle({ ...context, request: undefined }).toPromise()).rejects.toThrow('No request was included in the context');

    });

    it('should error when no context request body is provided', async () => {

      await expect(() => solidClientStaticAuthRegistrationHandler.handle({ ...context, request: { ...context.request, body: null } }).toPromise()).rejects.toThrow('No body was included in the request');
      await expect(() => solidClientStaticAuthRegistrationHandler.handle({ ...context, request: { ...context.request, body: undefined } }).toPromise()).rejects.toThrow('No body was included in the request');

    });

  });

});
