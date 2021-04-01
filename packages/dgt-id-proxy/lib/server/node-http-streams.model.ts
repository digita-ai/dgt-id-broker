import { IncomingMessage, ServerResponse } from 'http';

/**
 * An interface for classes representing NodeHttpStreams
 * and describing a requestStream and  responseStream
 *
 * @interface
 */
export interface NodeHttpStreams {
  requestStream: IncomingMessage;
  responseStream: ServerResponse;
}
