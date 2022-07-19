import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { getLogger } from '@digita-ai/handlersjs-logging';

const logger = getLogger();

/**
 * Creates an error response object based upon the given message and error.
 * Takes an optional headers object to add to the response.
 *
 * @param { string } msg - The error message to use in the error response.
 * @param { string } error - The type of error to use in the error response.
 * @param { { [key: string]: string } | undefined } headers?
 * @returns The error response object based upon the given parameters with a 400 status code.
 */
export const createErrorResponse = (
  status: number,
  msg: string,
  error: string,
  headers?: { [key: string]: string } | undefined,
): HttpHandlerResponse => ({
  body: JSON.stringify({ error, error_description: msg }),
  headers: headers ? headers : {},
  status,
});

/**
 * Takes a response object and checks if it is an error response.
 * If so it returns the body containing the error message.
 *
 * @param { HttpHandlerResponse } response - The response to check for an error.
 * @returns The response body containing an error response, otherwise undefined.
 */
export const checkError = (response: HttpHandlerResponse) => {

  try {

    const body = JSON.parse(response.body);

    return body.error
      ? body
      : undefined;

  } catch (err) {

    logger.info('Failed to create error response for error: ', err);

    return undefined;

  }

};
