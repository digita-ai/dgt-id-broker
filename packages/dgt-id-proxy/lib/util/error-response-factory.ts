import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { getLogger } from '@digita-ai/handlersjs-logging';

const logger = getLogger();

export const createErrorResponse = (
  msg: string,
  error: string,
  headers?: { [key: string]: string } | undefined,
): HttpHandlerResponse => ({
  body: JSON.stringify({ error, error_description: msg }),
  headers: headers ? headers : {},
  status: 400,
});

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
