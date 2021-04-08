import { createServer, IncomingMessage, ServerResponse } from 'http';
import { of } from 'rxjs';
import { Server } from './../util/server';
import { NodeHttpStreams } from './node-http-streams.model';
import { NodeHttpStreamsHandler } from './node-http-streams.handler';

/**
 * A {Server} implemented with [Node.js HTTP]{@link https://nodejs.org/api/http.html}, handling requests through a {NodeHttpStreamsHandler}.
 */
export class NodeHttpServer extends Server {

  private server;

  /**
   * Creates a {NodeHttpServer} listening on `http://``host``:``port`, passing requests through the given {NodeHttpStreamsHandler}.
   *
   * @param {string} host- the host name on which to listen
   * @param {number} port - the port number on which to listen
   * @param {NodeHttpStreamsHandler} nodeHttpStreamsHandler - the handler handling incoming requests
   * @constructor
   */
  constructor(protected host: string, protected port: number, private nodeHttpStreamsHandler: NodeHttpStreamsHandler){
    super(`http`, host, port);

    if (!host) {
      throw new Error('A host must be provided');
    } else if (!port) {
      throw new Error('A port must be provided');
    } else if (!nodeHttpStreamsHandler) {
      throw new Error('A handler must be provided');
    } else {
      this.server = createServer(this.serverHelper.bind(this));
    }
  }

  /**
   * @override
   * {@inheritDoc Server.start}
   */
  start() {
    this.server.listen(this.port, this.host);
    // eslint-disable-next-line no-console
    console.log('server started');
    return of(this);
  }

  /**
   * @override
   * {@inheritDoc Server.start}
   */
  stop() {
    this.server.close();
    return of(this);
  }

  /**
   * Helper function that provides a callback through which the Node.js HTTP server
   * can send requests. It combines the IncomingMessage and ServerResponse into
   * a NodeHttpStreams and passes it through the handler.
   *
   * @param {IncomingMessage} req - the Node.js HTTP callback's request stream
   * @param {ServerResponse} res - the Node.js HTTP callback's response stream
   */
  serverHelper(req: IncomingMessage, res: ServerResponse): void {
    if (!req) {
      throw new Error('request must be defined.');
    }
    if (!res) {
      throw new Error('response must be defined.');
    }
    const nodeHttpStreams: NodeHttpStreams = {
      requestStream: req,
      responseStream: res,
    };
    this.nodeHttpStreamsHandler.handle(nodeHttpStreams).subscribe();
  }

}
