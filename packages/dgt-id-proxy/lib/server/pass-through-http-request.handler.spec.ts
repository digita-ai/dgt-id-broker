import http, { IncomingMessage, OutgoingMessage } from 'http';
import https from 'https';
import { Socket } from 'net';
import { gzipSync, brotliCompressSync, deflateSync } from 'zlib';
import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { PassThroughHttpRequestHandler } from './pass-through-http-request.handler';

describe('PassThroughHttpRequestHandler', () => {

  let handler: PassThroughHttpRequestHandler;
  let context: HttpHandlerContext;
  let resp: IncomingMessage;
  const mockHttpBuffer = Buffer.from('mockHttp');
  let httpRequest: OutgoingMessage;

  const mockRequestImplementation = (body: Buffer, callback: (response: IncomingMessage) => void) => {

    callback(resp);
    resp.emit('data', body);
    resp.emit('end');
    httpRequest = new http.OutgoingMessage();
    httpRequest.write = jest.fn();

    return httpRequest;

  };

  http.request = jest.fn().mockImplementation((options, callback) => mockRequestImplementation(Buffer.from('mockHttp'), callback));

  https.request = jest.fn().mockImplementation((options, callback) => mockRequestImplementation(Buffer.from('mockHttps'), callback));

  beforeEach(async () => {

    context = { request: { headers: {}, method: 'GET', url: new URL('http://localhost:3000/') } };
    handler = new PassThroughHttpRequestHandler('localhost', 3000, 'http:', 'http://urlofproxy.com');
    resp = new http.IncomingMessage(new Socket());
    resp.statusCode = 200;

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  it('should error when no host or port is provided', () => {

    expect(() => new PassThroughHttpRequestHandler(undefined, 3000, 'http:', 'http://urlofproxy.com')).toThrow('No host was provided');
    expect(() => new PassThroughHttpRequestHandler(null, 3000, 'http:', 'http://urlofproxy.com')).toThrow('No host was provided');
    expect(() => new PassThroughHttpRequestHandler('localhost', undefined, 'http:', 'http://urlofproxy.com')).toThrow('No port was provided');
    expect(() => new PassThroughHttpRequestHandler('localhost', null, 'http:', 'http://urlofproxy.com')).toThrow('No port was provided');
    expect(() => new PassThroughHttpRequestHandler('localhost', 3000, undefined, 'http://urlofproxy.com')).toThrow('No scheme was provided');
    expect(() => new PassThroughHttpRequestHandler('localhost', 3000, null, 'http://urlofproxy.com')).toThrow('No scheme was provided');
    expect(() => new PassThroughHttpRequestHandler('localhost', 3000, 'http:', undefined)).toThrow('No proxyUrl was provided');
    expect(() => new PassThroughHttpRequestHandler('localhost', 3000, 'http:', null)).toThrow('No proxyUrl was provided');

  });

  it('should error when scheme is not http: or https:', () => {

    expect(() => new PassThroughHttpRequestHandler('localhost', 3000, 'unsupportedScheme', 'http://urlofproxy.com')).toThrow('Scheme should be "http:" or "https:"');

  });

  it('should error when proxyUrl is not a valid URL', () => {

    expect(() => new PassThroughHttpRequestHandler('localhost', 3000, 'http:', 'invalidurl')).toThrow('proxyUrl must be a valid URL');

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

    it('should call http.request when scheme is http', async () => {

      await expect(handler.handle(context).toPromise()).resolves
        .toEqual({ body: mockHttpBuffer, status: 200, headers: {} });

      expect(http.request).toHaveBeenCalledTimes(1);

    });

    it('should call https.request when scheme is https', async () => {

      const httpsHandler = new PassThroughHttpRequestHandler('localhost', 3000, 'https:', 'http://urlofproxy.com');
      await expect(httpsHandler.handle(context).toPromise()).resolves.toEqual({ body: Buffer.from('mockHttps'), status: 200, headers: {} });
      expect(https.request).toHaveBeenCalledTimes(1);

    });

    it('should call write on the request when the request includes a body', async () => {

      context.request.body = 'mockBody';
      await handler.handle(context).toPromise();
      expect(httpRequest.write).toHaveBeenCalledTimes(1);

    });

    it('should call write on the request with a stringified JSON string when the request includes a JSON object body', async () => {

      context.request.body = { mockKey: 'mockValue' };
      await handler.handle(context).toPromise();
      expect(httpRequest.write).toHaveBeenCalledTimes(1);
      expect(httpRequest.write).toHaveBeenCalledWith(JSON.stringify(context.request.body));

    });

    it('should replace the upstream url with the proxyUrl in the location header', async () => {

      resp.headers = {
        location: 'http://localhost:3000/mock/path',
      };

      await expect(handler.handle(context).toPromise()).resolves.toEqual({ body: mockHttpBuffer, status: 200, headers: { location: 'http://urlofproxy.com/mock/path' } });

    });

    it('should leave location unchanged if it does not match upstream url', async () => {

      resp.headers = {
        location: 'http://notupstream.com/mock/path',
      };

      await expect(handler.handle(context).toPromise()).resolves.toEqual({ body: mockHttpBuffer, status: 200, headers: { location: 'http://notupstream.com/mock/path' } });

    });

    it('should return a 500 statuscode if the upstream did not provide a statuscode itself', async () => {

      resp.statusCode = undefined;

      await expect(handler.handle(context).toPromise()).resolves
        .toEqual({ body: mockHttpBuffer, status: 500, headers: {} });

    });

    it('should reject the observable with an object containing status and headers when errorHandling is true and statuscode is more than 400', async () => {

      resp.statusCode = 400;
      const errorHandlingHandler = new PassThroughHttpRequestHandler('digita.ai', 80, 'http:', 'http://urlofproxy.com', true);

      await expect(errorHandlingHandler.handle(context).toPromise()).rejects.toEqual({ headers: {}, status: 400 });

    });

    it('should throw an error when the response receives an error event', async () => {

      const mockErrorResponseImplementation = (body: string, callback: (response: IncomingMessage) => void) => {

        callback(resp);
        resp.emit('error', new Error('mock error'));
        resp.emit('end');

        return httpRequest;

      };

      http.request = jest.fn().mockImplementation((options, callback) => mockErrorResponseImplementation('mockHttp', callback));
      await expect(handler.handle(context).toPromise()).rejects.toThrow('Error resolving the response in the PassThroughHandler: mock error');

    });

    it('should replace the upstream url with the proxy url in html files if they are preceded by "action=\"", "href=\"", or "src=\""', async () => {

      resp.headers = {
        'content-type': 'text/html',
      };

      http.request = jest.fn().mockImplementation((options, callback) => mockRequestImplementation(Buffer.from('<src="http://localhost:3000/test"\><action="http://localhost:3000/test"\><href="http://localhost:3000/test"\><value="http://localhost:3000/test"\>'), callback));
      const response = await handler.handle(context).toPromise();

      expect(response.body.toString()).toEqual('<src="http://urlofproxy.com/test"\><action="http://urlofproxy.com/test"\><href="http://urlofproxy.com/test"\><value="http://localhost:3000/test"\>');

    });

    it('should replace the upstream url with the proxy url in html files when content encoding is gzip', async () => {

      resp.headers = {
        'content-type': 'text/html',
        'content-encoding': 'gzip',
      };

      const body = gzipSync('<src="http://localhost:3000/test"\><value="http://localhost:3000/test"\>');

      http.request = jest.fn().mockImplementation((options, callback) => mockRequestImplementation(body, callback));

      const response = await handler.handle(context).toPromise();

      expect(response.body.toString()).toEqual('<src="http://urlofproxy.com/test"\><value="http://localhost:3000/test"\>');

    });

    it('should replace the upstream url with the proxy url in html files when content encoding is br', async () => {

      resp.headers = {
        'content-type': 'text/html',
        'content-encoding': 'br',
      };

      const body = brotliCompressSync('<src="http://localhost:3000/test"\><value="http://localhost:3000/test"\>');

      http.request = jest.fn().mockImplementation((options, callback) => mockRequestImplementation(body, callback));

      const response = await handler.handle(context).toPromise();

      expect(response.body.toString()).toEqual('<src="http://urlofproxy.com/test"\><value="http://localhost:3000/test"\>');

    });

    it('should replace the upstream url with the proxy url in html files when content encoding is deflate', async () => {

      resp.headers = {
        'content-type': 'text/html',
        'content-encoding': 'deflate',
      };

      const body = deflateSync('<src="http://localhost:3000/test"\><value="http://localhost:3000/test"\>');

      http.request = jest.fn().mockImplementation((options, callback) => mockRequestImplementation(body, callback));

      const response = await handler.handle(context).toPromise();

      expect(response.body.toString()).toEqual('<src="http://urlofproxy.com/test"\><value="http://localhost:3000/test"\>');

    });

    it('should error when content-encoding type is unknown', async () => {

      resp.headers = {
        'content-type': 'text/html',
        'content-encoding': 'unknownDecompressionType',
      };

      const body = deflateSync('<src="http://localhost:3000/test"\><value="http://localhost:3000/test"\>');

      http.request = jest.fn().mockImplementation((options, callback) => mockRequestImplementation(body, callback));

      await expect(() => handler.handle(context).toPromise()).rejects.toThrow(`Compression type 'unknownDecompressionType' is unknown`);

    });

    it('should remove the content-encoding header and return decoded body', async () => {

      resp.headers = {
        'content-type': 'application/json',
        'content-encoding': 'br',
      };

      const body = brotliCompressSync(JSON.stringify({ mockKey: 'mockValue' }));

      http.request = jest.fn().mockImplementation((options, callback) => mockRequestImplementation(body, callback));

      const response = await handler.handle(context).toPromise();

      expect(response.body).toEqual(JSON.stringify({ mockKey: 'mockValue' }));
      expect(response.headers['content-encoding']).toBeUndefined();

    });

    it('should clean the response headers', async () => {

      resp.headers = {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store',
        'content-type': 'text/html',
      };

      http.request = jest.fn().mockImplementation((options, callback) => mockRequestImplementation(Buffer.from('some body'), callback));

      const response = await handler.handle(context).toPromise();

      expect(response.headers).toEqual({
        'content-type': 'application/json,text/html',
        'connection': 'keep-alive',
        'pragma': 'no-cache',
        'cache-control': 'no-cache, no-store',
      });

    });

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
