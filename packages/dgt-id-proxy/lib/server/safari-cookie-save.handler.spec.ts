import { lastValueFrom, of } from 'rxjs';
import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { InMemoryStore } from '../storage/in-memory-store';
import { SafariCookieSaveHandler } from './safari-cookie-save.handler';

describe('SafariCookieSaveHandler', () => {

  const store = new InMemoryStore() as InMemoryStore<string, string>;
  const state = 'hKFo2SBHdzJBMFFwLUxIcmp3Um';
  const cookies = 'did=s%3Av0%3Af9a07f70-b419-11ec-a357-91ddac1a39df.rSBdlgwAjdvMukpYnLu0z1o41xGKujmwsT2Wpdtcy%2BE; Max-Age=31557600; Path=/; Expires=Tue, 04 Apr 2023 19:20:19 GMT; HttpOnly; Secure; SameSite=None';

  const response = {
    headers: { 'set-cookie': cookies },
  };

  const nestedHandler = {
    canHandle: jest.fn(),
    handle: jest.fn().mockReturnValue(of(response)),
    safeHandle: jest.fn(),
  };

  const handler = new SafariCookieSaveHandler(nestedHandler, store);
  let context: HttpHandlerContext;

  beforeEach(() => {

    context = {
      request: {
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15' },
        body: {},
        method: 'POST',
        url: new URL(`http://localhost:3003/authorize?state=${state}`),
      },
    };

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  describe('constructor', () => {

    it('should throw an error if no HttpHandler is provided', () => {

      expect(() => new SafariCookieSaveHandler(null, store)).toThrowError('A HttpHandler must be provided');
      expect(() => new SafariCookieSaveHandler(undefined, store)).toThrowError('A HttpHandler must be provided');

    });

    it('should throw an error if no cookie store is provided', () => {

      expect(() => new SafariCookieSaveHandler(nestedHandler, null)).toThrowError('A cookie store must be provided');
      expect(() => new SafariCookieSaveHandler(nestedHandler, undefined)).toThrowError('A cookie store must be provided');

    });

  });

  describe('handle', () => {

    it('should error when no context was provided', async () => {

      await expect(() => lastValueFrom(handler.handle(undefined))).rejects.toThrow('Context cannot be null or undefined');
      await expect(() => lastValueFrom(handler.handle(null))).rejects.toThrow('Context cannot be null or undefined');

    });

    it('should error when no request was provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: undefined }))).rejects.toThrow('No request was included in the context');

    });

    it('should error when no url is provided', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, url: undefined } }))).rejects.toThrow('A URL must be provided');

    });

    it('should error when not state was found', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, url: new URL('http://localhost:3003/authorize?state=') } }))).rejects.toThrow('No state was found in the request');

    });

    it('should error when no request headers were found', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: undefined } }))).rejects.toThrow('No headers were found in the request');

    });

    it('should error when no user agent was found', async () => {

      await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: { 'user-agent': undefined } } }))).rejects.toThrow('No userAgent was found in the request');

    });

    it('should handle the context using the nestedHandler', async () => {

      await lastValueFrom(handler.handle(context));

      expect(nestedHandler.handle).toHaveBeenCalledTimes(1);
      expect(nestedHandler.handle).toHaveBeenCalledWith(context);

    });

    it('should save the cookies to the store using state as key when user agent is Safari', async () => {

      store.set = jest.fn();
      await expect(lastValueFrom(handler.handle(context))).resolves.toEqual(response);

      expect(store.set).toHaveBeenCalledTimes(1);
      expect(store.set).toHaveBeenCalledWith(state, cookies);

    });

  });

  describe('canHandle', () => {

    it('should return false if no context was provided', async () => {

      await expect(lastValueFrom(handler.canHandle(undefined))).resolves.toEqual(false);
      await expect(lastValueFrom(handler.canHandle(null))).resolves.toEqual(false);

    });

    it('should return false if no request was provided', async () => {

      await expect(lastValueFrom(handler.canHandle({ ...context, request: undefined }))).resolves.toEqual(false);

    });

    it('should return false if no url is provided', async () => {

      await expect(lastValueFrom(handler.canHandle(
        { ...context, request: { ...context.request, url: undefined } }
      ))).resolves.toEqual(false);

    });

    it('should return false if no headers are provided', async () => {

      await expect(lastValueFrom(handler.canHandle(
        { ...context, request: { ...context.request, headers: undefined } }
      ))).resolves.toEqual(false);

    });

  });

});
