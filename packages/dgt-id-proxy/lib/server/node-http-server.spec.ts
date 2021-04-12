import { HttpHandler } from '@digita-ai/handlersjs-http';
import { of } from 'rxjs';
import { NodeHttpServer } from './node-http-server';
import { NodeHttpRequestResponseHandler } from './node-http-request-response.handler';

describe('NodeHttpServer', () => {
  let server: NodeHttpServer;
  let handler: NodeHttpRequestResponseHandler;
  let nestedHttpHandler: HttpHandler;
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
    server.start = jest.fn().mockReturnValueOnce(of());
    server.stop = jest.fn().mockReturnValueOnce(of());
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

  describe('start()', () => {
    it('should return successfully', async () => {
      await server.start().toPromise();
      expect(server.start).toHaveReturned();
    });
  });

  describe('stop()', () => {
    it('should return successfully', async () => {
      await server.stop().toPromise();
      expect(server.stop).toHaveReturned();
    });
  });
});
