import { Session } from './models/session.model';
import { Profile } from './models/profile.model';
import { Issuer } from './models/issuer.model';
import { Source } from './models/source.model';
import { Client } from './models/client.model';

/**
 * Service for interacting with Solid pods
 */
export interface SolidService {

  /**
   * Retrieves the value of a single oidcIssuer triple from a profile document
   * for a given WebID
   *
   * @param webId The WebID for which to retrieve the OIDC issuer
   */
  getIssuer(webId: string): Promise<Issuer>;

  /**
   * Retrieves the value of the oidcIssuer triples from a profile document
   * for a given WebID
   *
   * @param webId The WebID for which to retrieve the OIDC issuers
   */
  getIssuers(webId: string): Promise<Issuer[]>;

  /**
   * Adds a new oidcIssuer to the given WebID profile
   *
   * @param webId The WebID for which to retrieve the OIDC issuers
   * @param issuers The issuers to add
   */
  addIssuers(webId: string, issuers: Issuer[]): Promise<Issuer[]>;

  /**
   * Retrieves the value of the account triples from a profile document
   * for a given WebID
   *
   * @param webId The WebID for which to retrieve the OIDC issuers
   */
  getSources(webId: string): Promise<Source[]>;

  /**
   * Handles the post-login logic, as well as the restoration
   * of sessions on page refreshes
   */
  getSession(): Promise<Session>;

  /**
   * Redirects the user to their OIDC provider
   */
  login(webId: string, client: Client): Promise<void>;

  /**
   * Redirects the user to their OIDC provider
   */
  loginWithIssuer(issuer: Issuer, client: Client): Promise<void>;

  /**
   * Deauthenticates the user from their OIDC issuer
   */
  logout(): Promise<void>;

  /**
   * Retrieves the profile for the given WebID.
   *
   * @param webId The WebID for which to retrieve the profile.
   */
  getProfile(webId: string): Promise<Profile>;

  /**
   * Retrieves values for the http://www.w3.org/ns/pim/space#storage predicate for a given WebID.
   *
   * @param webId The WebID for which to retrieve the profile.
   */
  getStorages(webId: string): Promise<string[]>;

}
