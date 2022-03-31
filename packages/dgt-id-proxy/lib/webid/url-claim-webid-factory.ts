import { getLoggerFor } from '@digita-ai/handlersjs-logging';
import { Observable, of, throwError } from 'rxjs';
import { ParsedJSON } from '../util/parsed-json';
import { WebIdFactory } from './webid-factory';

/**
 * A { UrlClaimWebIdFactory } class that implements the WebIdFactory interface and extracts the webID
 * from the given custom claim.
 */
export class UrlClaimWebIdFactory extends WebIdFactory {

  private logger = getLoggerFor(this, 5, 5);

  /**
   * Creates a { UrlClaimWebIdFactory }.
   *
   * @param { string } claim - the name of the custom claim that needs to be retrieved from the id token.
   */
  constructor(public claim: string) {

    super();

    if (!claim) throw new Error('A claim must be provided.');

  }

  /**
   * Mints a webid based on the provided payload using the custom claim.
   */

  handle(payload: ParsedJSON): Observable<string> {

    if (!payload){

      this.logger.verbose('No payload provided', payload);

      return throwError(() => new Error('No payload was provided'));

    }

    if (!payload[this.claim]){

      this.logger.verbose(`Custom claim (${this.claim}) is not present in id token payload`, payload);

      return throwError(() => new Error('The custom claim provided was not found in the id token payload'));

    }

    this.logger.info('Minting webid for custom claim: ', payload[this.claim]);

    return of(payload[this.claim].toString());

  }

  /**
   * Returns true if the payload is defined. Otherwise it returns false.
   *
   * @param {ParsedJSON} payload
   */
  canHandle(payload: ParsedJSON): Observable<boolean> {

    this.logger.info('Checking canHandle', payload);

    return payload ? of(true) : of(false);

  }

}
