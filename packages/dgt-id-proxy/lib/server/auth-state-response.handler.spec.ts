import { HttpHandler, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, lastValueFrom } from 'rxjs';
import { MemoryStore } from '@digita-ai/handlersjs-storage';
import { AuthStateResponseHandler } from './auth-state-response.handler';

describe('AuthStateResponseHandler', () => {

  let handler: AuthStateResponseHandler;
  let nestedHandler: HttpHandler;
  let response: HttpHandlerResponse;

  let store: MemoryStore<{ [key: string]: boolean }>;

  beforeEach(() => {

    response = { body: 'mockBody', headers: { location: 'http://redirect-uri.com/redirect?state=1234' }, status:200 };
    store = new MemoryStore<{ [key: string]: boolean }>();

    nestedHandler = {
      handle: jest.fn().mockReturnValue(of(response)),
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

      await expect(() => lastValueFrom(handler.handle(undefined))).rejects.toThrow('Response cannot be null or undefined');
      await expect(() => lastValueFrom(handler.handle(null))).rejects.toThrow('Response cannot be null or undefined');

    });

    it('should error when no state is present on the location header when it is a valid URL', async () => {

      response.headers.location = 'http://redirect-uri.com/redirect';
      await expect(() => lastValueFrom(handler.handle(response))).rejects.toThrow('Unknown state');

    });

    it('should error when state on the location header is not found in the store', async () => {

      await expect(() => lastValueFrom(handler.handle(response))).rejects.toThrow('Unknown state');

    });

    it('should leave state on the location header when it was sent by the user and remove the state from the keyValueStore', async () => {

      store.set('1234', true);

      await expect(lastValueFrom(handler.handle(response))).resolves.toEqual(response);
      await expect(store.get('1234')).resolves.toBeUndefined();

    });

    it('should remove state from the location header when it was not sent by the user and remove the state from the keyValueStore', async () => {

      store.set('1234', false);

      await expect(lastValueFrom(handler.handle(response))).resolves.toEqual({ ...response, headers: { location: 'http://redirect-uri.com/redirect' } });
      await expect(store.get('1234')).resolves.toBeUndefined();

    });

    it('should return the response if the location header is not a valid URL', async () => {

      response.headers.location = '/relative/location/header';
      await expect(lastValueFrom(handler.handle(response))).resolves.toEqual(response);

    });

  });

  describe('canHandle', () => {

    it('should return false if no response was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(undefined))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle(null))).resolves.toEqual(false);

    });

    it('should return true if correct response was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(response))).resolves.toEqual(true);

    });

  });

});
