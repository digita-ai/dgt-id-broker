import { Observable, of, throwError } from 'rxjs';
import slugify from 'slugify';
import { WebIdFactory } from './webid-factory';

/**
 * A {SingleClaimWebIdFactory} class that implements the WebIdFactory interface and creates a minted webid
 * using the webid pattern en custom claim provided
 */
export class SingleClaimWebIdFactory implements WebIdFactory {

  /**
   * Creates a {SingleClaimWebIdFactory}.
   *
   * @param {string} webIdPattern - the pattern of the webid. Should contain a claim starting with ':'
   * that will be replaced by the custom claim in the id token.
   * @param {string} claim - the name of the custom claim that needs to be retrieved from the id token
   * and added to the webIdPattern above.
   */
  constructor(public webIdPattern: string, public claim: string = 'sub') {

    if (!webIdPattern) { throw new Error('A WebID pattern must be provided'); }

    if (!claim) { throw new Error('A claim id must be provided'); }

  }

  /**
   * It errors when no custom claim is provided.
   *
   * The custom claim is 'slugified' using the following library: https://www.npmjs.com/package/slugify
   * Special characters are replaced according to this charmap: https://github.com/simov/slugify/blob/master/config/charmap.json
   * Special characters that are not in the charmap are removed (this includes '?', '#', '^', '{', '}', '[', ']', etc.).
   * We also remove the character '|', and the character ':'.
   */

  handle(input: { [x: string]: string }): Observable<string> {

    if (!input[this.claim]){

      return throwError(new Error('The custom claim provided was not found in the id token payload'));

    }

    const custom_claim = input[this.claim].replace(/[|:]/g, '');
    const minted_webid = this.webIdPattern.replace(new RegExp('(?<!localhost|[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}):+[a-zA-Z0-9][^/.]+'), slugify(custom_claim));

    return of(minted_webid);

  }

  /**
   * Returns true if the input is defined. Otherwise it returns false.
   *
   * @param {{ [x: string]: string })} input
   */
  canHandle(input: { [x: string]: string }): Observable<boolean> {

    return input ? of(true) : of(false);

  }

  /**
   * Returns the custom claim provided in the constructor parameters
   */
  getClaim(): string {

    return this.claim;

  }

}
