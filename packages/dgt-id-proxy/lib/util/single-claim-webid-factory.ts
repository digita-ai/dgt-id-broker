import { Observable, of, throwError } from 'rxjs';
import slugify from 'slugify';
import { WebIDFactory } from './webid-factory';

/**
 * A {SingleClaimWebIDFactory} class that implements the WebIdFactory interface and creates a minted webid
 * using the webid pattern en custom claim provided
 */
export class SingleClaimWebIDFactory implements WebIDFactory {

  /**
   * Creates a {SingleClaimWebIDFactory}.
   *
   * @param {string} webIdPattern - the pattern of the webid. Should contain a claim starting with ':'
   * that will be replaced by the custom claim in the id token.
   * @param {string} claim - the name of the custom claim that needs to be retrieved from the id token
   * and added to the webIdPattern above.
   */
  constructor(public webIdPattern: string, public claim: string = 'sub') {

    if (!webIdPattern) { throw new Error('A WebID pattern must be provided'); }

  }

  /**
   * It errors when no custom claim is provided.
   *
   * The custom claim is 'slugified' using the following library: https://www.npmjs.com/package/slugify
   * Special characters are replaced according to this charmap: https://github.com/simov/slugify/blob/master/config/charmap.json
   * Special characters that are not in the charmap are removed (this includes '?', '#', '^', '{', '}', '[', ']', etc.).
   * We also remove the character '|', and the character ':'.
   */

  handle(payload: { [x: string]: string }): Observable<string> {

    if (!payload){

      return throwError(new Error('No payload was provided'));

    }

    if (!payload[this.claim]){

      return throwError(new Error('The custom claim provided was not found in the id token payload'));

    }

    const custom_claim = payload[this.claim].replace(/[|:]/g, '');
    const minted_webid = this.webIdPattern.replace(new RegExp('(?<!localhost|[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}):+[a-zA-Z0-9][^/.]+'), slugify(custom_claim));

    return of(minted_webid);

  }

  /**
   * Returns true if the payload is defined. Otherwise it returns false.
   *
   * @param {{ [x: string]: string })} payload
   */
  canHandle(payload: { [x: string]: string }): Observable<boolean> {

    return payload ? of(true) : of(false);

  }

}
