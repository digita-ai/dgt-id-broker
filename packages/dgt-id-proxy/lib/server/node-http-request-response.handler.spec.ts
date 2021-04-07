import { Socket } from 'net';
import { IncomingMessage, ServerResponse } from 'http';
import { of } from 'rxjs';
import { HttpHandler, HttpHandlerContext, HttpHandlerRequest, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { NodeHttpRequestResponseHandler } from './node-http-request-response.handler';
import { NodeHttpStreams } from './node-http-streams.model';

describe('NodeHttpRequestResponseHandler', () => {
  let handler: NodeHttpRequestResponseHandler;
  let nestedHttpHandler: HttpHandler;
  let streamMock: NodeHttpStreams;
  let req: IncomingMessage;
  let res: ServerResponse;

  beforeEach(async () => {
    nestedHttpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValueOnce(of({ body: {}, headers: {}, status: 200 })),
      safeHandle: jest.fn(),
    } as HttpHandler;
    handler = new NodeHttpRequestResponseHandler(nestedHttpHandler);
    req = new IncomingMessage(new Socket());
    req.url = 'www.bla.bla';
    req.method = 'GET';
    req.headers = {};
    res = new ServerResponse(req);
    res.writeHead = jest.fn();
    res.write = jest.fn();
    res.end = jest.fn();
    streamMock = {
      requestStream: req,
      responseStream: res,
    };
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('nested should be correctly instantiated', () => {
    expect(nestedHttpHandler).toBeTruthy();
  });

  describe('handle()', () => {
    it('should error when url is null/undefined', () => {
      streamMock.requestStream.url = null;
      expect(streamMock.requestStream.url).toBeNull();
      expect(() => handler.handle(streamMock).toPromise()).rejects.toThrow('url of the request cannot be null or undefined.');
    });

    it('should error when method is null/undefined', () => {
      streamMock.requestStream.method = null;
      expect(streamMock.requestStream.method).toBeNull();
      expect(() => handler.handle(streamMock).toPromise()).rejects.toThrow('method of the request cannot be null or undefined.');
    });

    it('should error when headers is null/undefined', () => {
      streamMock.requestStream.headers = null;
      expect(streamMock.requestStream.headers).toBeNull();
      expect(() => handler.handle(streamMock).toPromise()).rejects.toThrow('headers of the request cannot be null or undefined.');
    });

    describe('nestedHttpHandler.handle()', () => {
      it('should be called', async () => {
        await handler.handle(streamMock).toPromise();
        expect(nestedHttpHandler.handle).toHaveBeenCalledTimes(1);
      });

      it('should writeHead to responseStream', async () => {
        await handler.handle(streamMock).toPromise();
        expect(streamMock.responseStream.writeHead).toHaveBeenCalledWith(200, {});
        expect(streamMock.responseStream.write).toHaveBeenCalledWith({});
        expect(streamMock.responseStream.getHeaders()).toEqual({});
        expect(streamMock.responseStream.statusCode).toEqual(200);
      });

      it('should close the output stream', async () => {
        await handler.handle(streamMock).toPromise();
        expect(streamMock.responseStream.end).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('canHandle', () => {
    it('returns false if input.responseStream is null', () => {
      streamMock.requestStream = null;
      expect(streamMock.requestStream).toBeNull();
      expect(handler.canHandle(streamMock).toPromise()).resolves.toBe(false);
    });

    it('returns false if input.responseStream is undefined', () => {
      streamMock.requestStream = undefined;
      expect(streamMock.requestStream).toBeUndefined();
      expect(handler.canHandle(streamMock).toPromise()).resolves.toBe(false);
    });

    it('returns false if input.responseStream is null', () => {
      streamMock.responseStream = null;
      expect(streamMock.responseStream).toBeNull();
      expect(handler.canHandle(streamMock).toPromise()).resolves.toBe(false);
    });

    it('returns false if input.responseStream is undefined', () => {
      streamMock.responseStream = undefined;
      expect(streamMock.responseStream).toBeUndefined();
      expect(handler.canHandle(streamMock).toPromise()).resolves.toBe(false);
    });

    it('returns true if input is complete', () => {
      expect(handler.canHandle(streamMock).toPromise()).resolves.toBe(true);
    });
  });
});
