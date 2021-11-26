import { Observable, of, throwError } from 'rxjs';
import slugify from 'slugify';
import { ParsedJSON } from '../util/parsed-json';
import { WebIdFactory } from './webid-factory';

/**
 * A {SingleClaimWebIdFactory} class that implements the WebIdFactory interface and creates a minted webid
 * using the webid pattern en custom claim provided
 */
export class SingleClaimWebIdFactory extends WebIdFactory {

  /**
   * Creates a {SingleClaimWebIdFactory}.
   *
   * @param {string} webIdPattern - the pattern of the webid. Should contain a claim starting with ':'
   * that will be replaced by the custom claim in the id token.
   * @param {string} claim - the name of the custom claim that needs to be retrieved from the id token
   * and added to the webIdPattern above.
   */
  constructor(public webIdPattern: string, public claim: string = 'sub') {

    super();

    if (!webIdPattern) { throw new Error('A WebID pattern must be provided'); }

  }

  /**
   * Mints a webid based on the provided payload using the custom claim.
   */

  handle(payload: ParsedJSON): Observable<string> {

    if (!payload){

      return throwError(() => new Error('No payload was provided'));

    }

    if (!payload[this.claim]){

      return throwError(() => new Error('The custom claim provided was not found in the id token payload'));

    }

    const custom_claim = payload[this.claim].toString().replace(/[|:]/g, '');

    const minted_webid = this.webIdPattern.replace(new RegExp('(?<!localhost|[0-9]\.[0-9]\.[0-9]\.[0-9]|[a-zA-Z0-9]):+[a-zA-Z0-9][^\/.]+'), slugify(custom_claim));

    return of(minted_webid);

  }

  /**
   * Returns true if the payload is defined. Otherwise it returns false.
   *
   * @param {ParsedJSON} payload
   */
  canHandle(payload: ParsedJSON): Observable<boolean> {

    return payload ? of(true) : of(false);

  }

}
