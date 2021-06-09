import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { AuthStateResponseHandler } from './auth-state-response.handler';

describe('AuthStateResponseHandler', () => {

  let handler: AuthStateResponseHandler;
  let nestedHandler: HttpHandler;
  let context: HttpHandlerContext;
  let response: HttpHandlerResponse;

  let store: InMemoryStore<string, boolean>;

  beforeEach(() => {

    response = { body: 'mockBody', headers: { location: 'http://redirect-uri.com/redirect?state=1234' }, status:200 };
    store = new InMemoryStore<string, boolean>();

    nestedHandler = {
      handle: jest.fn().mockReturnValue(of(response)),
      canHandle: jest.fn(),
      safeHandle: jest.fn(),
    };

    handler = new AuthStateResponseHandler(store);

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no keyValueStore is provided', () => {

    expect(() => new AuthStateResponseHandler(undefined)).toThrow('A keyValueStore must be provided');
    expect(() => new AuthStateResponseHandler(null)).toThrow('A keyValueStore must be provided');

  });

  describe('handle', () => {

    it('should error when no response was provided', async () => {

      await expect(() => handler.handle(undefined).toPromise()).rejects.toThrow('Response cannot be null or undefined');
      await expect(() => handler.handle(null).toPromise()).rejects.toThrow('Response cannot be null or undefined');

    });

    it('should error when no state is present on the location header when it is a valid URL', async () => {

      response.headers.location = 'http://redirect-uri.com/redirect';
      await expect(() => handler.handle(response).toPromise()).rejects.toThrow('Unknown state');

    });

    it('should error when state on the location header is not found in the store', async () => {

      await expect(() => handler.handle(response).toPromise()).rejects.toThrow('Unknown state');

    });

    it('should leave state on the location header when it was sent by the user and remove the state from the keyValueStore', async () => {

      store.set('1234', true);

      await expect(handler.handle(response).toPromise()).resolves.toEqual(response);
      await expect(store.get('1234')).resolves.toBeUndefined();

    });

    it('should remove state from the location header when it was not sent by the user and remove the state from the keyValueStore', async () => {

      store.set('1234', false);

      await expect(handler.handle(response).toPromise()).resolves.toEqual({ ...response, headers: { location: 'http://redirect-uri.com/redirect' } });
      await expect(store.get('1234')).resolves.toBeUndefined();

    });

    it('should return the response if the location header is not a valid URL', async () => {

      response.headers.location = '/relative/location/header';
      await expect(handler.handle(response).toPromise()).resolves.toEqual(response);

    });

  });

  describe('canHandle', () => {

    it('should return false if no response was provided', async () => {

      await expect(handler.canHandle(undefined).toPromise()).resolves.toEqual(false);
      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);

    });

    it('should return true if correct response was provided', async () => {

      await expect(handler.canHandle(response).toPromise()).resolves.toEqual(true);

    });

  });

});
