import { Daemon } from './daemon';

/**
 * Abstract class Server extending the abstract Daemon class so it can implement
 *
 * @class
 */
export abstract class Server extends Daemon {

  /**
   * Creates a new Server and super calls the Daemon cls
   * as
   *
   * @constructor
   * @param port - the port the server needs to run on
   * @param host - the host or ip the server needs to run on
   */
  constructor (protected port: number, protected host: string){
    super();
  }

}
