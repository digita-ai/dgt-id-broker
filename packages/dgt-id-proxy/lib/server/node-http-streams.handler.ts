import { Handler } from '@digita-ai/handlersjs-core';
import { NodeHttpStreams } from './node-http-streams.model';

/**
 * Abstract class NodeHttpStreamsHandler extending a Handler of type NodeHttpStreams.
 * Used to lock the type of the handler to NodeHttpStreams.
 */
export abstract class NodeHttpStreamsHandler extends Handler<NodeHttpStreams> {

}
