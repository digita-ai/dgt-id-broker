import { Quad } from 'rdf-js';
import { Parser } from 'n3';
import { validateAndFetch } from './validate-and-fetch';

/**
 * Transform all data from a turtle file to a list of Quads
 *
 * @param url the url of the turtle file to convert to Quads
 * @returns an array of Quads from the turtle file
 */
export const getTurtleFileAsQuads = async (url: string): Promise<Quad[]> => {

  if (!url) { throw new Error('Parameter "url" should be defined!'); }

  try {

    const result = await validateAndFetch(url);

    if (!result.headers.get('content-type')?.includes('text/turtle')) throw new Error('Content type is not text/turtle');

    const body = await result.text();

    return new Parser().parse(body);

  } catch (error: unknown) {

    throw new Error(`Something went wrong while converting to Quads: ${error}`);

  }

};
