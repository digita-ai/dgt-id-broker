import { Quad } from 'rdf-js';
import { Parser, Quad as N3Quad } from 'n3';

export const getTurtleFileAsQuads = async (url: URL): Promise<Quad[]> => {

  if (!url) {

    throw new Error('Parameter "url" should be defined!');

  }

  try {

    const quads: Quad[] = [];

    const result = await fetch(url.toString());
    const body = await result.text();
    const parser = new Parser();

    parser.parse(body, (error: Error, quad: N3Quad, prefixes) => {

      // Loops over all quads + one cycle containing only the prefixes
      if (quad) {

        quads.push({
          subject: quad.subject,
          object: quad.object,
          predicate: quad.predicate,
          graph: quad.graph,
          termType: quad.termType,
          value: quad.value,
          equals: quad.equals,
        } as Quad);

      }

    });

    return quads;

  } catch (error: unknown) {

    throw new Error(`Something went wrong while converting to Quads: ${error}`);

  }

};
