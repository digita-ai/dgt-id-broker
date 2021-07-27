import { Quad } from 'rdf-js';
import { Issuer } from '../models/issuer.model';
import { getTurtleFileAsQuads } from './data-module';

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

export const getIssuerFromQuads = async (quads: Quad[]): Promise<Issuer | undefined> => {

  if (!quads) {

    throw new Error('Parameter "quads" should be defined!');

  }

  const issuerQuad = quads.find((quad: Quad) =>
    quad.predicate?.value === 'http://www.w3.org/ns/solid/terms#oidcIssuer');

  return issuerQuad?.object?.value ? { url: new URL(issuerQuad.object.value) } : undefined;

};

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
