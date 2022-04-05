import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { lastValueFrom, of } from 'rxjs';
import { InMemoryStore } from '../storage/in-memory-store';
import { SafariCookieRestoreHandler } from './safari-cookie-restore.handler';

describe('SafaraCookieRestoreHandler', () => {

  const state = 'hKFo2SBHdzJBMFFwLUxIcmp3Um';
  const refererState = 'o2NpZNkgcjVvaW9ObFgxSXlNOWduUTJ';
  const cookies = 'did=s%3Av0%3Af9a07f70-b419-11ec-a357-91ddac1a39df.rSBdlgwAjdvMukpYnLu0z1o41xGKujmwsT2Wpdtcy%2BE; Max-Age=31557600; Path=/; Expires=Tue, 04 Apr 2023 19:20:19 GMT; HttpOnly; Secure; SameSite=None';

  const nestedHandler = {
    canHandle: jest.fn(),
    handle: jest.fn().mockReturnValue(of({})),
    safeHandle: jest.fn(),
  };

  const store = new InMemoryStore() as InMemoryStore<string, string>;
  const handler = new SafariCookieRestoreHandler(nestedHandler, store);
  let context: HttpHandlerContext;

  beforeEach(async () => {

    context = {
      request: {
        headers: { 'referer': `http://localhost:3003/u/login?state=${state}` },
        body: {},
        method: 'POST',
        url: new URL(`http://localhost:3003/u/login?state=${state}`),
      },
    };

    await store.set(state, cookies);

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  describe('constructor', () => {

    it('should throw an error if no HttpHandler is provided', () => {

      expect(() => new SafariCookieRestoreHandler(null, store)).toThrowError('A HttpHandler must be provided');
      expect(() => new SafariCookieRestoreHandler(undefined, store)).toThrowError('A HttpHandler must be provided');

    });

    it('should throw an error if no cookie store is provided', () => {

      expect(() => new SafariCookieRestoreHandler(nestedHandler, null)).toThrowError('A cookie store must be provided');
      expect(() => new SafariCookieRestoreHandler(nestedHandler, undefined)).toThrowError('A cookie store must be provided');

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

      it('should error when no state was found', async () => {

        await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, url: new URL('http://localhost:3003/authorize?state=') } }))).rejects.toThrow('No state was found in the request');

      });

      it('should error when no request headers were found', async () => {

        await expect(() => lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: undefined } }))).rejects.toThrow('No headers were found in the request');

      });

      it('should retrieve the cookies from the store using state', async() => {

        store.get = jest.fn().mockReturnValueOnce(of(cookies));

        await lastValueFrom(handler.handle(context));

        expect(store.get).toHaveBeenCalledTimes(1);
        expect(store.get).toHaveBeenCalledWith(state);

      });

      it('should error when no cookies matched the state in the store', async () => {

        store.get = jest.fn().mockReturnValueOnce(of(undefined));

        await expect(() => lastValueFrom(handler.handle(context))).rejects.toThrow('No matching cookies found for state ' + state);

      });

      it('should swap states with refererState if not the same', async () => {

        store.get = jest.fn().mockReturnValueOnce(of(cookies));

        await lastValueFrom(handler.handle({ ...context, request: { ...context.request, headers: { 'referer': `http://localhost:3003/u/login?state=${refererState}` } } }));

        expect(store.get).toHaveBeenCalledTimes(1);
        expect(store.get).toHaveBeenCalledWith(refererState);

      });

      it('should handle the context using the nestedHandler', async () => {

        store.get = jest.fn().mockReturnValueOnce(of(cookies));

        await lastValueFrom(handler.handle(context));

        expect(nestedHandler.handle).toHaveBeenCalledWith(context);

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

      it('should return true if all is provided', async () => {

        await expect(lastValueFrom(handler.canHandle(context))).resolves.toEqual(true);

      });

    });

  });

});
