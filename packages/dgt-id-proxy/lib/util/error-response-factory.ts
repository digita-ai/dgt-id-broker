import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';

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

    return undefined;

  }

};
