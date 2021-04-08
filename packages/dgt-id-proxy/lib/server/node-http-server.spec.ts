import { HttpHandler, HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { Observable, of } from 'rxjs';
import { Server } from './../util/server';
import { NodeHttpServer } from './node-http-server';
import { MockHttpHandler } from './http.handler.mock';
import { NodeHttpRequestResponseHandler } from './node-http-request-response.handler';

describe('NodeHttpServer', () => {
  let server: NodeHttpServer;
  let handler: NodeHttpRequestResponseHandler;
  let nestedHttpHandler: HttpHandler;
  let mockHandler: MockHttpHandler;
  let context: HttpHandlerContext;
  let host: string;
  let port: number;

  beforeAll(() => {
    nestedHttpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockReturnValueOnce(of({ body: {}, headers: {}, status: 200 })),
      safeHandle: jest.fn(),
    } as HttpHandler;
    handler = new NodeHttpRequestResponseHandler(nestedHttpHandler);
    host = 'test';
    port = 8080;
    server = new NodeHttpServer(host, port, handler);
    server.start = jest.fn();
    server.stop = jest.fn();
    mockHandler = new MockHttpHandler();
    context = { request: { headers: {}, method: '', path: '' } };
  });

  it('should be correctly instantiated if all correct arguments are provided', () => {
    expect(server).toBeTruthy();
  });

  it('should throw error when no host was provided', () => {
    expect(() => new NodeHttpServer(null, port, handler)).toThrow('A host must be provided');
  });

  it('should throw error when no port was provided', () => {
    expect(() => new NodeHttpServer(host, null, handler)).toThrow('A port must be provided');
  });

  it('should throw error when no handler was provided', () => {
    expect(() => new NodeHttpServer(host, port, null)).toThrow('A handler must be provided');
  });

  it('should throw error when no arguments are provided', () => {
    expect(() => new NodeHttpServer(null, null, null)).toThrow('No arguments were provided');
  });

  describe('start()', () => {
    it('should return the desired type', async () => {
      const repServer = new Observable<Server>();
      await server.start().toPromise();
      expect(server.start).toHaveReturnedWith(repServer);
    });
  });
});
