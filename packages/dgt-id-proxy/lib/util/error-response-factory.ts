import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';

export const createErrorResponse = (
  msg: string,
  error: string,
): HttpHandlerResponse => ({
  body: JSON.stringify({ error, error_description: msg }),
  headers: { },
  status: 400,
});
