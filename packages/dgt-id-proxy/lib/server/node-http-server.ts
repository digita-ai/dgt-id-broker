import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Subject } from 'rxjs';
import { Server } from './../util/server';
import { NodeHttpStreams } from './node-http-streams.model';
import { NodeHttpStreamsHandler } from './node-http-streams.handler';
import { Daemon } from 'lib/util/daemon';

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
    }
    if (!port) {
      throw new Error('A port must be provided');
    }
    if (!nodeHttpStreamsHandler) {
      throw new Error('A handler must be provided');
    }

    this.server = createServer(this.serverHelper.bind(this));
  }

  /**
   * @override
   * {@inheritDoc Server.start}
   */
  start() {
    const subject = new Subject<Daemon>();

    this.server.on(('error'), (err) => {
      subject.error(err);
    });

    this.server.on(('listening'), () => {
      subject.next(this);
      subject.complete();
    });

    this.server.listen(this.port, this.host);

    return subject;
  }

  /**
   * @override
   * {@inheritDoc Server.start}
   */
  stop() {
    const subject = new Subject<Daemon>();

    this.server.on(('error'), (err) => {
      subject.error(err);
    });

    this.server.on(('close'), () => {
      subject.next(this);
      subject.complete();
    });

    this.server.close();

    return subject;
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
