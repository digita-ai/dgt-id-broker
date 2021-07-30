import { Quad } from 'rdf-js';
import { Parser, Quad as N3Quad } from 'n3';

/**
 * Transform all data from a turtle file to a list of Quads
 *
 * @param url the url of the turtle file to convert to Quads
 * @returns an array of Quads from the turtle file
 */
export const getTurtleFileAsQuads = async (url: string): Promise<Quad[]> => {

  if (!url) { throw new Error('Parameter "url" should be defined!'); }

  try {

    const result = await fetch(url);
    const body = await result.text();

    return new Parser().parse(body);

  } catch (error: unknown) {

    throw new Error(`Something went wrong while converting to Quads: ${error}`);

  }

};
