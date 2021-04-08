
import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
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
  let req: IncomingMessage;
  let res: ServerResponse;

  beforeAll(() => {
    nestedHttpHandler = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      safeHandle: jest.fn(),
    };
    handler = new NodeHttpRequestResponseHandler(nestedHttpHandler);
    handler.handle = jest.fn().mockReturnValueOnce(of());
    host = 'test';
    port = 8080;
    server = new NodeHttpServer(host, port, handler);
    req = new IncomingMessage(new Socket());
    req.url = 'www.digita.ai';
    req.method = 'GET';
    req.headers = {};
    res = new ServerResponse(req);
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
    it('should return an observable of the NodeHttpServer', async () => {
      await expect(server.start().toPromise()).resolves.toEqual(server);
    });
  });

  describe('stop()', () => {
    it('should return an observable of the NodeHttpServer', async () => {
      await expect(server.stop().toPromise()).resolves.toEqual(server);
    });
  });

  describe('serverHelper()', () => {
    it('should call the handle function of the nested handler', async () => {
      await server.serverHelper(req, res);

      expect(handler.handle).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when request is null or undefined', () => {
      expect(() => server.serverHelper(null, res)).toThrow('request must be defined.');

      expect(() => server.serverHelper(undefined, res)).toThrow('request must be defined.');
    });

    it('should throw an error when response is null or undefined', () => {
      expect(() => server.serverHelper(req, null)).toThrow('response must be defined.');

      expect(() => server.serverHelper(req, undefined)).toThrow('response must be defined.');
    });
  });
});
