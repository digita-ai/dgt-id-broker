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
   * that will be replaced by the sub claim in the access token.
   */
  constructor(private webIdPattern: string) {

    super();

    if (!webIdPattern) {

      throw new Error('A WebID pattern must be provided');

    }

  }

  /**
   * Handles the response. Checks if the access token already contains a webid. If it does not, it checks wether
   * the id token already contains a webid. If it does not it uses the sub claim from the access token
   * to create a webid and add it to the access token payload.
   *
   * The sub claim is 'slugified' using the following library: https://www.npmjs.com/package/slugify
   * Special characters are replaced according to this charmap: https://github.com/simov/slugify/blob/master/config/charmap.json
   * Special characters that are not in the charmap are removed (this includes '?', '#', '^', '{', '}', '[', ']', etc.).
   * We also remove the character '|', and the character ':'.
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) {

      return throwError(new Error('A response must be provided'));

    }

    if (!response.body) {

      return throwError(new Error('The response did not contain a body'));

    }

    if (!response.body.access_token) {

      return throwError(new Error('The response body did not contain an access_token'));

    }

    if (!response.body.access_token.payload) {

      return throwError(new Error('The access_token did not contain a payload'));

    }

    if (!response.body.id_token) {

      return throwError(new Error('The response body did not contain an id_token'));

    }

    const access_token_payload = response.body.access_token.payload;
    const id_token_payload = response.body.id_token.payload;

    if (!access_token_payload.sub) {

      return throwError(new Error('No sub claim was included in the access token'));

    }

    if (!access_token_payload.webid) {

      if (id_token_payload.webid) {

        access_token_payload.webid = id_token_payload.webid;

      } else {

        const sub = access_token_payload.sub.replace(/[|:]/g, '');
        access_token_payload.webid = this.webIdPattern.replace(new RegExp('(?<!localhost|[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}):+[a-zA-Z0-9][^/.]+'), slugify(sub));

      }

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
