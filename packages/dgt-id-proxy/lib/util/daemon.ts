/**
 * This class represents typically long-running daemon processes that can be started and stopped.
 */
export abstract class Daemon {

  /**
   * Start the server
   *
   * @abstract
   * @function
   */
  abstract start(): any;
  /**
   * Stop the server
   *
   * @abstract
   * @function
   */
  abstract stop(): any;
}
