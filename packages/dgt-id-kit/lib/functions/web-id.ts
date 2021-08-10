import { Quad } from 'rdf-js';
import { Issuer } from '../models/issuer.model';
import { getTurtleFileAsQuads } from './data';
import { isValidIssuer } from './issuer';

/**
 * Transform all data from a profile to a list of Quads
 *
 * @param webid the webid to convert to Quads
 * @returns an array of Quads from the profile
 */
export const getWebIdProfile = async (webid: string): Promise<Quad[]> => {

  if (!webid) { throw new Error('Parameter "webid" should be defined!'); }

  let quads: Quad[];
  let profileDocumentQuadPresent: boolean;

  try {

    quads = await getTurtleFileAsQuads(webid);

    // Verify that it is in fact a profile
    profileDocumentQuadPresent = quads.some((quad: Quad) =>
      quad?.predicate?.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
      quad?.object?.value === 'http://xmlns.com/foaf/0.1/PersonalProfileDocument');

  } catch(error: unknown) {

    throw new Error(`Something went wrong getting the profile for webId"${webid.toString()}": ${error}`);

  }

  if (!profileDocumentQuadPresent) { throw new Error(`No valid profile found for WebID: "${webid}"`); }

  return quads;

};

/**
 * Get all Issuer instances created from a list of Quads, most likely from a profile
 *
 * @param quads list of quads
 * @returns list of Issuer instances if found, or an empty list when no issuer was found
 */
export const getIssuersFromQuads = async (quads: Quad[]): Promise<Issuer[]> => {

  if (!quads) { throw new Error('Parameter "quads" should be defined!'); }

  const issuerQuads = quads.filter((quad: Quad) =>
    quad.predicate?.value === 'http://www.w3.org/ns/solid/terms#oidcIssuer');

  const result: Issuer[] = [];

  issuerQuads.forEach((quad: Quad) => {

    if (quad?.object?.value) {

      result.push({ url: new URL(quad.object.value) });

    }

  });

  return result;

};

/**
 * Get the first Issuer instance created from a list of Quads, most likely from a profile
 *
 * @param quads list of quads
 * @returns an Issuer instance if found, or undefined if not
 */
export const getFirstIssuerFromQuads = async (quads: Quad[]): Promise<Issuer | undefined> => {

  if (!quads) { throw new Error('Parameter "quads" should be defined!'); }

  const allIssuers = await getIssuersFromQuads(quads);

  return allIssuers.length > 0 ? allIssuers[0] : undefined;

};

/**
 * Provided a webid, this function will return you all Issuer instances
 *
 * @param webid the webid of which you want the Issuer
 * @returns an list of Issuer instances
 */
export const getIssuersFromWebId = async (webid: string): Promise<Issuer[]> => {

  if (!webid) { throw new Error('Parameter "webid" should be defined!'); }

  try {

    const quads = await getWebIdProfile(webid);
    const issuers = await getIssuersFromQuads(quads);

    const validatedIssuers = await Promise.all(issuers.map(async (iss: Issuer) =>
      await isValidIssuer(iss.url.toString()) ? iss : undefined));

    return validatedIssuers.filter(<T>(maybe: T | undefined): maybe is T => !!maybe);

  } catch(error: unknown) {

    throw new Error(`Something went wrong getting the issuer for webId "${webid.toString()}": ${error}`);

  }

};

/**
 * Provided a webid, this function will return you the first Issuer instance or undefined
 * depending on whether an oidcIssuer is mentioned on the profile of this webid
 *
 * @param webid the webid of which you want the Issuer
 * @returns an Issuer instance if one was found, or undefined when no issuer was found
 */
export const getFirstIssuerFromWebId = async (webid: string): Promise<Issuer | undefined> => {

  if (!webid) { throw new Error('Parameter "webid" should be defined!'); }

  try {

    const issuers = await getIssuersFromWebId(webid);

    return issuers?.[0];

  } catch(error: unknown) {

    throw new Error(`Something went wrong getting the issuer for webId "${webid.toString()}": ${error}`);

  }

};
