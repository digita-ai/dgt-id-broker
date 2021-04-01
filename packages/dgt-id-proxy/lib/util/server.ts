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
   */
  constructor (port: number){
    super();
  }

}
