import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Handler } from '@digita-ai/handlersjs-core';
import { Server } from './../util/server';
import { NodeHttpStreams } from './node-http-streams.model';
import { NodeHttpStreamsHandler } from './node-http-streams.handler';

/**
 * NodeHttpServer class that extends the Server class. The Server class is our own.
 *
 * @class
 */
export class NodeHttpServer extends Server {

  private server;

  /**
   * The constructor takes two dependencies. In the constructor we initialise a Server from the
   * Node http package.
   *
   * @param {NodeHttpStreamsHandler} nodeHttpStreamsHandler
   * @param {number} port
   * @param {string} host
   * @constructor
   */
  constructor(private nodeHttpStreamsHandler: NodeHttpStreamsHandler, protected port: number, protected host: string){
    super(port, host);
    this.server = createServer(this.serverHelper);
  }

  /**
   * start simply tells the server to start listening on the port provided in the constructor.
   */
  start(){
    this.server.listen(this.port, this.host);
  }

  /**
   * stop closes the server.
   */
  stop(){
    this.server.close();
  }

  /**
   * serverHelper is a helper function that provides a callback through which the Node http server
   * can send requests. serverHelper transforms the IncomingMessage and ServerResponse object into
   * the type we need which is NodeHttpStreams and passes it on to the handler that was given to this
   * class as a dependency.
   *
   * @param {IncomingMessage} req
   * @param {ServerResponse} res
   */
  serverHelper(req: IncomingMessage, res: ServerResponse): void{
    const nodeHttpStreams: NodeHttpStreams = {
      requestStream: req,
      responseStream: res,
    };
    // eslint-disable-next-line no-console
    console.log(this.nodeHttpStreamsHandler);
    this.nodeHttpStreamsHandler.handle(nodeHttpStreams);
  }

}

