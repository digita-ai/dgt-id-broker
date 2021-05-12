import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { PassThroughHttpRequestHandler } from './pass-through-http-request.handler';

describe('PassThroughHttpRequestHandler', () => {

  let handler: PassThroughHttpRequestHandler;
  let context: HttpHandlerContext;

  beforeEach(async () => {

    context = { request: { headers: {}, method: 'GET', url: new URL('http://localhost:3000/') } };
    handler = new PassThroughHttpRequestHandler('localhost', 3000);

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no host or port is provided', () => {

    expect(() => new PassThroughHttpRequestHandler(undefined, 3000)).toThrow('No host was provided');
    expect(() => new PassThroughHttpRequestHandler(null, 3000)).toThrow('No host was provided');
    expect(() => new PassThroughHttpRequestHandler('localhost', undefined)).toThrow('No port was provided');
    expect(() => new PassThroughHttpRequestHandler('localhost', null)).toThrow('No port was provided');

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

    it('should error when no context request method is provided', async () => {

      context.request.method = null;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No method was included in the request');
      context.request.method = undefined;
      await expect(() => handler.handle(context).toPromise()).rejects.toThrow('No method was included in the request');

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

    // it('should return a 200 response code', async () => {
    //   await expect(handler.handle(context).toPromise()).resolves.toEqual(expect.objectContaining({ status: 200 }));
    // });

  });

  describe('canHandle', () => {

    it('should return false if no context was provided', async () => {

      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);

    });

    it('should return false if no context request was provided', async () => {

      context.request = undefined;
      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(false);

    });

    it('should return true if correct context was provided', async () => {

      await expect(handler.canHandle(context).toPromise()).resolves.toEqual(true);

    });

  });

});
