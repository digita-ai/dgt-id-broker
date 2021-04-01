import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Handler } from '@digita-ai/handlersjs-core';
import { Server } from './../util/server';
import { NodeHttpStreams } from './node-http-streams.model';
import { NodeHttpStreamsHandler } from './node-http-streams.handler';

export class NodeHttpServer extends Server{

  private server;

  constructor(private nodeHttpStreamsHandler: NodeHttpStreamsHandler, private port: number){
    super(port);
    this.server = createServer(this.serverHelper);
  }

  start(){
    this.server.listen(this.port);
  }

  stop(){
    this.server.close();
  }

  serverHelper(req: IncomingMessage, res: ServerResponse): void{
    const nodeHttpStreams: NodeHttpStreams = {
      requestStream: req,
      responseStream: res,
    };
    this.nodeHttpStreamsHandler.handle(nodeHttpStreams);
  }

}

