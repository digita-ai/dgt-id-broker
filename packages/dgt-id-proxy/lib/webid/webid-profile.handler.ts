import * as path from 'path';
import { readFile } from 'fs/promises';
import { Handler } from '@digita-ai/handlersjs-core';
import { Observable, of, throwError, from, zip } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Writer, DataFactory } from 'n3';
import { JWK, JWTPayload } from 'jose/types';
import parseJwk from 'jose/jwk/parse';
import SignJWT from 'jose/jwt/sign';
import { v4 as uuid }  from 'uuid';

const { literal } = DataFactory;

export class PredicatePair {

  constructor(public tokenKey: string, public predicate: string) {}

}

/**
 * A {Handler} that handles a {HttpHandlerResponse} by checking if the webId given in the id_token
 * has a WebId profile document and if not creates a new profile & .acl document for the webId.
 */
export class WebIdProfileHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  /**
   * Creates a {WebIdProfileHandler}.
   *
   * @param PredicatePair[]} predicates - the predicates that need to be set in the profile document
   * @param {string} proxyWebId - the webId of the proxy server
   * @param {string} pathToJwks - the path to a json file containing JWKs to sign the tokens.
   */
  constructor(
    private predicates: PredicatePair[],
    private proxyWebId: string,
    private pathToJwks: string,
    private proxyUrl: string
  ) {

    super();

    if (!predicates || predicates.length === 0) { throw new Error('Predicate list is required'); }

    if (!proxyWebId) { throw new Error('WebId is required'); }

    if (!pathToJwks) { throw new Error('Path to JWKS is required'); }

  }

  /**
   * Handles the response. Checks if an id_token and webId is present.
   * Checks if a profile document already exists for the webId and if not creates a new one + acl document
   *
   * @param {HttpHandlerResponse} response
   */
  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) { return throwError(new Error('A response must be provided')); }

    if (!response.body) { return throwError(new Error('A response body must be provided')); }

    if (!response.body.id_token) { return throwError(new Error('An id token must be provided')); }

    if (!response.body.id_token.payload.webid) { return throwError(new Error('A webId must be provided')); }

    const id_token = response.body.id_token;
    const webId = response.body.id_token.payload.webid;

    const jwt_payload: JWTPayload = {
      iss: this.proxyUrl,
      sub: id_token.payload.sub,
      aud: 'solid',
      jti: uuid(),
      exp: Math.round((new Date()).getTime() / 1000) + 7200,
      iat: Math.round((new Date()).getTime() / 1000),
      webid: this.proxyWebId,

    };

    return from(fetch(webId, { method: 'HEAD', headers: { Accept: 'text/turtle' } })).pipe(
      switchMap((resp) => {

        if (resp.status !== 200) {

          return this.signJwtPayload(jwt_payload, 'at+jwt').pipe(
            switchMap((token) => {

              const proxyUrl = new URL(this.proxyWebId);
              const userUrl = new URL(webId);
              // example: http://localhost:3002/clientapp/tonypaillard/profile/card
              const proxyURI = proxyUrl.origin + '/' + proxyUrl.pathname.split('/')[1] + userUrl.pathname;
              // example: http://localhost:3002/clientapp/tonypaillard/profile/card.acl
              const aclURI = proxyUrl.origin + '/' +  proxyUrl.pathname.split('/')[1] + userUrl.pathname + '.acl';
              const profileResp = from(fetch(proxyURI, { method: 'PUT', headers: { Accept: 'text/turtle',  Authorization:  'Bearer ' + token, 'Content-Type': 'text/turtle' }, body: this.generateProfileDocument(id_token) }));
              const aclResp = from(fetch(aclURI, { method: 'PUT', headers: { Accept: 'text/turtle',  Authorization:  'Bearer ' + token, 'Content-Type': 'text/turtle' }, body: this.generateAclDocument(id_token.payload.webid) }));

              return zip(profileResp, aclResp).pipe(
                switchMap(([ profile, acl ]) => {

                  if (profile.status !== 200 && profile.status !== 201 && profile.status !== 205) return throwError(new Error('Failed to create a profile document'));

                  if (acl.status !== 200 && acl.status !== 201 && profile.status !== 205) return throwError(new Error('Failed to create Acl document'));

                  return of(response);

                })
              );

            }),
          );

        }

        return of(response);

      })
    );

  }

  /**
   * Specifies that if the response is defined this handler can handle the response.
   *
   * @param {HttpHandlerResponse} response
   */
  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response ? of(true) : of(false);

  }

  /**
   * Generates an acl document based on the webId provided.
   *
   * @param {string} webId - the webId provided in the id_token
   */
  private generateAclDocument(webId: string): string {

    return `# ACL resource for the WebID profile document
    @prefix acl: <http://www.w3.org/ns/auth/acl#>.
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.

    # The WebID profile is readable by the public.
    # This is required for discovery and verification,
    # e.g. when checking identity providers.
    <#public>
        a acl:Authorization;
        acl:agentClass foaf:Agent;
        acl:accessTo <./card>;
        acl:mode acl:Read.

    # The owner has full access to the entire
    # profile directory.
    <#owner>
        a acl:Authorization;
        acl:agent <${webId}>;
        acl:accessTo <./card>;
        acl:mode acl:Read, acl:Write, acl:Control.`;

  }

  /**
   * Generates a profile document based on the predicates provided in the constructor and the id_token.
   *
   * @param {{ header: any; payload: any }} id_token - the id_token provided in the response.
   *
   */
  private generateProfileDocument(id_token:  { header: any; payload: any }): string {

    const webId = id_token.payload.webid;

    const writer = new Writer({ prefixes: { foaf: 'http://xmlns.com/foaf/0.1/', solid: 'http://www.w3.org/ns/solid/terms#' } });
    let body = '';

    this.predicates.forEach((keyPredicatePair) => {

      writer.addQuad(
        DataFactory.namedNode(webId),
        DataFactory.namedNode(keyPredicatePair.tokenKey),
        literal(id_token.payload[keyPredicatePair.tokenKey]),
      );

    });

    writer.end((err, result) => body = result);

    return body;

  }

  private getSigningKit = () => from(readFile(
    path.isAbsolute(this.pathToJwks) ? this.pathToJwks : path.join(process.cwd(), this.pathToJwks)
  )).pipe(
    switchMap<Buffer, JWK>((keyFile) => of(JSON.parse(keyFile.toString()).keys[0])),
    switchMap((jwk) => zip(of(jwk.alg), of(jwk.kid), from(parseJwk(jwk)))),
  );

  private signJwtPayload = (jwtPayload: JWTPayload, typ: string) => zip(of(jwtPayload), this.getSigningKit()).pipe(
    switchMap(([ payload, [ alg, kid, key ] ]) => from(
      new SignJWT(payload)
        .setProtectedHeader({ alg, kid, typ })
        .setJti(uuid())
        .sign(key),
    )),
  );

}

