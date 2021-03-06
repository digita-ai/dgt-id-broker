
import * as path from 'path';
import { readFile } from 'fs/promises';
import { Handler } from '@digita-ai/handlersjs-core';
import { Observable, of, throwError, from, zip } from 'rxjs';
import { map, mapTo, switchMap, tap } from 'rxjs/operators';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Writer, DataFactory } from 'n3';
import { importJWK, JWK, JWTPayload, SignJWT } from 'jose';
import { v4 as uuid }  from 'uuid';

/**
 * A {Handler} that handles a {HttpHandlerResponse} by checking if the webId given in the id_token
 * has a WebId profile document and if not creates a new profile & .acl document for the webId.
 */
export class WebIdProfileHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Creates a {WebIdProfileHandler}.
   *
   * @param {string} webId - the webId of this handler; should have authorization to write the profiles
   * @param {string} idp - the URL of an IDP with which both the WebIDs and this handler can authenticate
   * @param {string} pathToJwks - the path to a JSON file containing the private JWKs used by the IDP to sign tokens
   * @param {string} webIdPattern - the pattern of the webid. Should contain a claim starting with ':'
   * that will be replaced by the custom claim in the id token. The claim should match ':[a-zA-Z]+'
   * @param {Record<string, string[]>} predicates - the predicates that need to be set in the profile document
   */
  constructor(
    private webId: string,
    private idp: string,
    private pathToJwks: string,
    private webIdPattern: string,
    private predicates?: [string, string[]][]
  ) {

    super();

    if (!webId) throw new Error('A WebId is required');
    if (!idp) throw new Error('An IDP URL is required');
    if (!pathToJwks) throw new Error('A path to JWKS is required');
    if (predicates && (
      !Array.isArray(predicates) || !predicates.every(([ pred, segments ]) =>
        typeof pred === 'string'
        && Array.isArray(segments)
        && segments.every((segment) => typeof segment === 'string'))
    )) throw new Error('Predicates must be an array');

  }

  /**
   * Handles the response. Checks if an id_token and webId is present.
   * Checks if a profile document already exists for the webId and if not creates a new one + acl document
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) return throwError(() => new Error('A response must be provided'));
    if (!response.body) return throwError(() => new Error('A response body must be provided'));
    if (!response.body.id_token) return throwError(() => new Error('An id token must be provided'));
    if (!response.body.id_token.payload.webid) return throwError(() => new Error('A webId must be provided'));

    const id_token_payload = response.body.id_token.payload;

    // split the pattern to remove the ':'-prefixed claim
    const splitPattern = this.webIdPattern.split(/:[a-zA-Z]+/g);

    // create a new regex that matches anything that is put inplace of where the ':'-prefixed claim was
    const regExp = new RegExp(splitPattern.join('?.*'));

    if (!regExp.test(id_token_payload.webid)) return of(response);

    return from(fetch(id_token_payload.webid, { method: 'HEAD', headers: { Accept: 'text/turtle' } })).pipe(
      switchMap((resp) => resp.status === 200 ? of(void 0) : this.createProfile(id_token_payload)),
      mapTo(response)
    );

  }

  private createProfile(id_token_payload: any): Observable<void> {

    const jwt_payload: JWTPayload = {
      iss: this.idp,
      sub: id_token_payload.sub,
      aud: 'solid',
      jti: uuid(),
      exp: Math.round((new Date()).getTime() / 1000) + 7200,
      iat: Math.round((new Date()).getTime() / 1000),
      webid: this.webId,
    };

    const webid = new URL(id_token_payload.webid);
    const target = webid.origin + webid.pathname;
    const successCodes = [ 200, 201, 205 ];

    return this.signJwtPayload(jwt_payload, 'at+jwt').pipe(
      map((access_token) => ({ Authorization:  'Bearer ' + access_token, 'Content-Type': 'text/turtle' })),
      switchMap((headers) => zip(
        of(headers),
        from(fetch(target, { method: 'PUT', headers, body: this.generateProfileDocument(id_token_payload) }))
      )),
      switchMap(([ headers, profile ]) => !successCodes.includes(profile.status)
        ? throwError(() => new Error('Failed to create a profile document'))
        : of(headers)),
      switchMap((headers) => from(fetch(`${target}.acl`, { method: 'PUT', headers, body: this.generateAclDocument(id_token_payload.webid) }))),
      switchMap((acl) => !successCodes.includes(acl.status)
        ? throwError(() => new Error('Failed to create ACL document'))
        : of(void 0)),
    );

  }

  /**
   * Generates an acl document based on the webId provided.
   *
   * @param {string} webId - the webId provided in the id_token
   */
  private generateAclDocument(webId: string): string {

    const url = new URL(webId);
    const target = url.origin + url.pathname;

    return `# ACL resource for the WebID profile document
    @prefix acl: <http://www.w3.org/ns/auth/acl#>.
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.

    # The WebID profile is readable by the public.
    # This is required for discovery and verification,
    # e.g. when checking identity providers.
    <#public>
        a acl:Authorization;
        acl:agentClass foaf:Agent;
        acl:accessTo <${target}>;
        acl:mode acl:Read.

    # The owner has full access to the entire
    # profile directory.
    <#owner>
        a acl:Authorization;
        acl:agent <${webId}>;
        acl:accessTo <${target}>;
        acl:mode acl:Read, acl:Write, acl:Control.`;

  }

  private getClaim(partial_payload: any, segments: string[]): string {

    if (typeof partial_payload !== 'object') throw new Error('Unexpected payload structure');
    if (!segments.length) throw new Error('Segments cannot be empty');

    return segments.length === 1
      ? partial_payload[segments[0]]
      : this.getClaim(partial_payload[segments[0]], segments.slice(1));

  }

  /**
   * Generates a profile document based on the predicates provided in the constructor and the id_token.
   *
   * @param {{ header: any; payload: any }} id_token - the id_token provided in the response.
   *
   */
  private generateProfileDocument(id_token_payload: any): string {

    const webId = id_token_payload.webid;

    const writer = new Writer({ prefixes: { foaf: 'http://xmlns.com/foaf/0.1/', solid: 'http://www.w3.org/ns/solid/terms#' } });

    this.predicates?.forEach(([ predicate, segments ]) => {

      writer.addQuad(
        DataFactory.namedNode(webId),
        DataFactory.namedNode(predicate),
        DataFactory.literal(this.getClaim(id_token_payload, segments)),
      );

    });

    writer.addQuad(
      DataFactory.namedNode(webId),
      DataFactory.namedNode('solid:oidcIssuer'),
      DataFactory.namedNode(this.idp)
    );

    let body = '';

    writer.end((err, result) => body = result);

    return body;

  }

  private getSigningKit = () => from(readFile(
    path.isAbsolute(this.pathToJwks) ? this.pathToJwks : path.join(process.cwd(), this.pathToJwks)
  )).pipe(
    switchMap((keyFile: Buffer) => of<JWK>(JSON.parse(keyFile.toString()).keys[0])),
    switchMap((jwk: JWK) => {

      if (!jwk.alg) return throwError(() => new Error(`JWK read from ${this.pathToJwks} did not contain an "alg" property.`));

      return zip(of(jwk.alg), of(jwk.kid), from(importJWK(jwk)));

    }),
  );

  private signJwtPayload = (jwtPayload: JWTPayload, typ: string) => zip(of(jwtPayload), this.getSigningKit()).pipe(
    switchMap(([ payload, [ alg, kid, key ] ]) => from(
      new SignJWT(payload)
        .setProtectedHeader({ alg, kid, typ })
        .setJti(uuid())
        .sign(key),
    )),
  );

  /**
   * Specifies that if the response is defined this handler can handle the response.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response ? of(true) : of(false);

  }

}

