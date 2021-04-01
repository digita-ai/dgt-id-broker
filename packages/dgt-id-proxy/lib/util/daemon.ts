/**
 * Abstract Daemon class with start & stop methods
 *
 * @class
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
