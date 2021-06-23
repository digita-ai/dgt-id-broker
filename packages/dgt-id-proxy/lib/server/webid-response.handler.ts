import { Handler } from '@digita-ai/handlersjs-core';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import slugify from 'slugify';

/**
 * A {HttpHandler} that adds the webid claim to the payload of the access token field in the response body.
 */
export class WebIDResponseHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Creates a {WebIDResponseHandler}.
   *
   * @param {string} webIdPattern - the pattern of the webid. Should contain a claim starting with ':'
   * that will be replaced by the custom claim in the id token.
   * @param {string} claim - the name of the custom claim that needs to be retrieved from the id token
   * and added to the webIdPattern above.
   */
  constructor(private webIdPattern: string, private claim: string = 'sub') {

    super();

    if (!webIdPattern) { throw new Error('A WebID pattern must be provided'); }

    if (!claim) { throw new Error('A claim id must be provided'); }

  }

  /**
   * Handles the response. Checks if the id token contains the custom claim provided to the constructor.
   * If not it returns an error. It checks if the id tokens payload contains a webid.
   * If the id token contains a webid it sets the web id in the access tokens payload to said webid.
   * If it does not it uses the custom claim from the id token
   * to create a webid and add it to the access token payload.
   *
   * The custom claim is 'slugified' using the following library: https://www.npmjs.com/package/slugify
   * Special characters are replaced according to this charmap: https://github.com/simov/slugify/blob/master/config/charmap.json
   * Special characters that are not in the charmap are removed (this includes '?', '#', '^', '{', '}', '[', ']', etc.).
   * We also remove the character '|', and the character ':'.
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) { return throwError(new Error('A response must be provided')); }

    if (!response.body) { return throwError(new Error('The response did not contain a body')); }

    if (!response.body.access_token) { return throwError(new Error('The response body did not contain an access_token')); }

    if (!response.body.access_token.payload) { return throwError(new Error('The access_token did not contain a payload')); }

    if (!response.body.id_token) { return throwError(new Error('The response body did not contain an id_token')); }

    const access_token_payload = response.body.access_token.payload;
    const id_token_payload = response.body.id_token.payload;

    if (!id_token_payload[this.claim]){

      return throwError(new Error('The custom claim provided was not found in the id token payload'));

    }

    if (id_token_payload.webid) {

      access_token_payload.webid = id_token_payload.webid;

    } else {

      const custom_claim = id_token_payload[this.claim].replace(/[|:]/g, '');
      const minted_webid = this.webIdPattern.replace(new RegExp('(?<!localhost|[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}):+[a-zA-Z0-9][^/.]+'), slugify(custom_claim));
      access_token_payload.webid = minted_webid;
      id_token_payload.webid = minted_webid;

    }

    return of(response);

  }

  /**
   * Returns true if the response is defined. Otherwise it returns false.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response ? of(true) : of(false);

  }

}
