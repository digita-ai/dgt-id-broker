import { Handler } from '@digita-ai/handlersjs-core';
import { NodeHttpStreams } from './node-http-streams.model';

/**
 * A {Handler} that handles the IncomingMessage and ServerResponse of a {NodeHttpStreams} object.
 */
export abstract class NodeHttpStreamsHandler extends Handler<NodeHttpStreams> { }
