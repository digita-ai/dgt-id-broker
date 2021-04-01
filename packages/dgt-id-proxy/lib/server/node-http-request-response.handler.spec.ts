import { Observable } from 'rxjs';
import { HttpHandler } from '@digita-ai/handlersjs-http';
import { NodeHttpRequestResponseHandler } from './node-http-request-response.handler';
import { NodeHttpStreams } from './node-http-streams.model';

describe('NodeHttpRequestResponseHandler', () => {
  let handler: NodeHttpRequestResponseHandler;
  let httpHandler: HttpHandler;
  let streams: NodeHttpStreams;

  beforeAll(() => {
    handler = new NodeHttpRequestResponseHandler(httpHandler);
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  it('handle() should return a void Observable', () => {
    const observable = new Observable<void>();
    expect(handler.handle(streams)).toBeInstanceOf(observable);
  });

});
