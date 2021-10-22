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
export class WebIdProfileHandler extends Handler<HttpHandlerResponse, HttpHandlerResponse> {

  constructor(
    private predicates: { tokenKey: string; predicate: string }[],
    private webId: string,
    private pathToJwks: string
  ) {

    super();

    if (!predicates) { throw new Error('Predicate list is required'); }

  }

  handle(response: HttpHandlerResponse): Observable<HttpHandlerResponse> {

    if (!response) { return throwError(new Error('A response must be provided')); }

    const headers = { Accept: 'text/turtle' } ;
    const webId = response.body.id_token.payload.webid;

    const jwt_payload: JWTPayload = {
      iss: this.webId,
      sub: response.body.id_token.payload.sub,
      aud: 'solid',
      jti: uuid(),
      exp: Math.round((new Date()).getTime() / 1000) + 7200,
      iat: Math.round((new Date()).getTime() / 1000),

    };

    return from(fetch(webId, { method: 'HEAD', headers })).pipe(
      switchMap((resp) => {

        if (resp.status !== 200) {

          return this.signJwtPayload(jwt_payload, 'at+jwt').pipe(
            switchMap((token) => {

              // create a webid profile document with a generated body based upon the predicate map
              const profileResp = from(fetch(webId, { method: 'PUT', headers: { ...headers, authorization:  'Bearer ' + token }, body: this.generateProfileDocument(response.body.id_token) }));
              const url = new URL(webId);
              const aclURI = url.origin + url.pathname + '.acl';
              const aclResp = from(fetch(aclURI, { method: 'PUT', headers: { ...headers, authorization:  'Bearer ' + token }, body: this.generateAclDocument(response.body.id_token) }));

              return zip(profileResp, aclResp).pipe(
                switchMap(([ profile, acl ]) => {

                  if (profile.status !== 200 && profile.status !== 201) return throwError(new Error('Failed to generate a profile document'));

                  if (acl.status !== 200 && acl.status !== 201) return throwError(new Error('Failed to generate Acl document'));

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

  canHandle(response: HttpHandlerResponse): Observable<boolean> {

    return response ? of(true) : of(false);

  }

  private generateAclDocument(id_token: { body: { payload: { webId: string } } }): string {

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
        acl:agent <${id_token.body.payload.webId}>;
        acl:accessTo <./card>;
        acl:mode acl:Read, acl:Write, acl:Control.`;

  }

  private generateProfileDocument(
    id_token: { body: { payload: { [x: string]: string | number; webId: any } } }
  ): string {

    const webId = id_token.body.payload.webId;

    const writer = new Writer({ prefixes: { foaf: 'http://xmlns.com/foaf/0.1/', solid: 'http://www.w3.org/ns/solid/terms#' } });
    let body = '';

    this.predicates.forEach((keyPredicatePair) => {

      writer.addQuad(
        DataFactory.namedNode(webId),
        DataFactory.namedNode(keyPredicatePair.predicate),
        literal(id_token.body.payload[keyPredicatePair.tokenKey]),
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
        .setIssuer(this.webId)
        .sign(key),
    )),
  );

}

