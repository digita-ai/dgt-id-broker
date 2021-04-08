import fetch, { Response } from 'node-fetch';
import { from } from 'rxjs';
import { HttpHandlerContext, HttpHandlerRequest, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { PassThroughHttpRequestHandler } from './pass-through-http-request.handler';

describe('PassThroughHttpRequestHandler', () => {
  let handler: PassThroughHttpRequestHandler;
  let url: URL;
  let context: HttpHandlerContext;

  beforeEach(async () => {
    url = new URL('https://www.digita.ai');
    context = { request: { headers: {}, method: 'GET', path: '' } };
    handler = new PassThroughHttpRequestHandler(url);
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('should error when no url is provided', () => {
    expect(() => new PassThroughHttpRequestHandler(undefined)).toThrow('No url was provided');
    expect(() => new PassThroughHttpRequestHandler(null)).toThrow('No url was provided');
  });

  describe('handle', () => {
    it('should error when no context was provided', () => {
      expect(() => handler.handle(undefined)).toThrow('Context cannot be null or undefined');
      expect(() => handler.handle(null)).toThrow('Context cannot be null or undefined');
    });

    it('should error when no context request was provided', () => {
      context.request = null;
      expect(() => handler.handle(context)).toThrow('No request was included in the context');
      context.request = undefined;
      expect(() => handler.handle(context)).toThrow('No request was included in the context');
    });

    it('should error when no context request method was provided', () => {
      context.request.method = null;
      expect(() => handler.handle(context)).toThrow('No method was included in the request');
      context.request.method = undefined;
      expect(() => handler.handle(context)).toThrow('No method was included in the request');
    });

    it('should error when no context request headers were provided', () => {
      context.request.headers = null;
      expect(() => handler.handle(context)).toThrow('No headers were included in the request');
      context.request.headers = undefined;
      expect(() => handler.handle(context)).toThrow('No headers were included in the request');
    });

    it('should return a 200 response code', async () => {
      await expect(handler.handle(context).toPromise()).resolves.toEqual(expect.objectContaining({ status: 200 }));
    });
  });

  describe('canHandle', () => {
    it('should return false if no context was provided', async () => {
      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);
    });

    it('should return false if context was provided', async () => {
      context.request = undefined;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);
    });

    it('should return true if correct context was provided', async () => {
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(true);
    });
  });

});
