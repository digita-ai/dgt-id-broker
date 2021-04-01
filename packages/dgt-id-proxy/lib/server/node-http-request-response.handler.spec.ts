import { IncomingMessage, ServerResponse } from 'http';
import { Observable } from 'rxjs';
import { mock, MockProxy } from 'jest-mock-extended';
import { HttpHandler, HttpHandlerContext, HttpHandlerRequest } from '@digita-ai/handlersjs-http';
import { NodeHttpRequestResponseHandler } from './node-http-request-response.handler';
import { NodeHttpStreams } from './node-http-streams.model';

describe('NodeHttpRequestResponseHandler', () => {
  let handler: NodeHttpRequestResponseHandler;
  let httpHandler: HttpHandler;
  let streamMock: MockProxy<NodeHttpStreams>;

  beforeAll(async () => {
    handler = new NodeHttpRequestResponseHandler(httpHandler);
    streamMock = mock<NodeHttpStreams>();
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('handle() should return a void Observable', () => {
    const observable = new Observable<void>();
    expect(handler.handle(streamMock)).toBeInstanceOf(observable);
  });
});
