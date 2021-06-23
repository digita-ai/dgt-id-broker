import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import fetchMock from 'jest-fetch-mock';
import { KeyValueStore } from '../storage/key-value-store';
import { InMemoryStore } from '../storage/in-memory-store';
import { ClientIdStaticAuthResponseHandler } from './client-id-static-auth-response.handler';

describe('ClientIdStaticAuthResponseHandler', () => {

  let response: HttpHandlerResponse;
  let store: KeyValueStore<string, URL>;
  let handler: ClientIdStaticAuthResponseHandler;

  beforeAll(() => fetchMock.enableMocks());

  beforeEach(async () => {

    store = new InMemoryStore();
    store.set('1234', new URL('http://client-redirect-uri.com/client'));

    handler  = new ClientIdStaticAuthResponseHandler(store);

    response = {
      body: 'mockBody',
      headers: { location: 'http://static-redirect-uri.com/redirect?code=abcdefg&state=1234' },
      status: 300,
    };

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no keyValueStore is provided', () => {

    expect(() => new ClientIdStaticAuthResponseHandler(undefined)).toThrow('No keyValueStore was provided');
    expect(() => new ClientIdStaticAuthResponseHandler(null)).toThrow('No keyValueStore was provided');

  });

  describe('handle', () => {

    it('should error when no response was provided', async () => {

      await expect(() => handler.handle(undefined).toPromise()).rejects.toThrow('No response was provided');
      await expect(() => handler.handle(null).toPromise()).rejects.toThrow('No response was provided');

    });

    it('should return the response as is when location header is not a valid url', async () => {

      response.headers.location = '/relative/location/redirect';
      await expect(handler.handle(response).toPromise()).resolves.toEqual(response);

    });

    it('should error when no state is found on the location header', async () => {

      response.headers.location = 'http://static-redirect-uri.com/redirect?code=abcdefg';
      await expect(() => handler.handle(response).toPromise()).rejects.toThrow('No state was found on the response. Cannot handle the response.');

    });

    it('should error when state in the location header was not found in the store', async () => {

      response.headers.location = 'http://static-redirect-uri.com/redirect?code=abcdefg&state=unkown';
      await expect(() => handler.handle(response).toPromise()).rejects.toThrow(`Response containing state 'unkown' does not have a matching request`);

    });

    it('should return response with location set to redirect-uri found in the store for the state', async () => {

      await expect(handler.handle(response).toPromise()).resolves.toEqual(
        { ...response, headers: { location: 'http://client-redirect-uri.com/client?code=abcdefg&state=1234' } }
      );

    });

  });

  describe('canHandle', () => {

    it('should return true if correct context was provided', async () => {

      await expect(handler.canHandle(response).toPromise()).resolves.toEqual(true);

    });

    it('should return false if no response was provided', async () => {

      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(handler.canHandle(undefined).toPromise()).resolves.toEqual(false);

    });

  });

});
