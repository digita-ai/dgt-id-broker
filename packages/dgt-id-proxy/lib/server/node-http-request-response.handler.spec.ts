import { mockDeep, MockProxy } from 'jest-mock-extended';
import { HttpHandler, HttpHandlerContext, HttpHandlerRequest, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { NodeHttpRequestResponseHandler } from './node-http-request-response.handler';
import { NodeHttpStreams } from './node-http-streams.model';

describe('NodeHttpRequestResponseHandler', () => {
  let handler: NodeHttpRequestResponseHandler;
  let nestedHttpHandler: HttpHandler;
  let streamMock: MockProxy<NodeHttpStreams>;

  beforeEach(async () => {
    nestedHttpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      safeHandle: jest.fn(),
    } as HttpHandler;
    handler = new NodeHttpRequestResponseHandler(nestedHttpHandler);
    streamMock = mockDeep<NodeHttpStreams>();
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  describe('handle()', () => {

    describe('nestHttpHandler.handle()', () => {
      it('nestHttpHandler.handle() should be called', () => {
        handler.handle(streamMock);
        expect(nestedHttpHandler.handle).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('canHandle', () => {
    it('always returns true', () => {
      expect(handler.canHandle(streamMock).toPromise()).resolves.toBe(true);
    });
  });
});
