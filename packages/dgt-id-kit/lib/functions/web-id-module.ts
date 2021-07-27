import { Quad } from 'rdf-js';
import { Issuer } from '../models/issuer.model';
import { getTurtleFileAsQuads } from './data-module';

/**
 * Transform all data from a profile to a list of Quads
 *
 * @param webid the webid to convert to Quads
 * @returns an array of Quads from the profile
 */
export const getWebIdProfile = async (webid: URL): Promise<Quad[]> => {

  if (!webid) {

    throw new Error('Parameter "webid" should be defined!');

  }

  try {

    return await getTurtleFileAsQuads(webid);

  } catch(error: unknown) {

    throw new Error(`Something went wrong getting the profile for webId"${webid.toString()}": ${error}`);

  }

};

/**
 * Get an Issuer instance created from a list of Quads, most likely from a profile
 *
 * @param quads list of quads
 * @returns an Issuer instance if one was found, or undefined when no issuer was found
 */
export const getIssuerFromQuads = async (quads: Quad[]): Promise<Issuer | undefined> => {

  if (!quads) {

    throw new Error('Parameter "quads" should be defined!');

  }

  const issuerQuad = quads.find((quad: Quad) =>
    quad.predicate?.value === 'http://www.w3.org/ns/solid/terms#oidcIssuer');

  return issuerQuad?.object?.value ? { url: new URL(issuerQuad.object.value) } : undefined;

};

/**
 * Provided a webid, this function will return you an Issuer instance or undefined
 * depending on whether an oidcIssuer is mentioned on the profile of this webid
 *
 * @param webid the webid of which you want the Issuer
 * @returns an Issuer instance if one was found, or undefined when no issuer was found
 */
export const getIssuerFromWebId = async (webid: URL): Promise<Issuer | undefined> => {

  if (!webid) {

    throw new Error('Parameter "webid" should be defined!');

  }

  try {

    const quads = await getWebIdProfile(webid);

    return await getIssuerFromQuads(quads);

  } catch(error: unknown) {

    throw new Error(`Something went wrong getting the issuer for webId"${webid.toString()}": ${error}`);

  }

};
