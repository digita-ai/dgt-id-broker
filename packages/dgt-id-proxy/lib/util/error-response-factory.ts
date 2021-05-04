import { HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, Observable } from 'rxjs';

export const createErrorResponse = (
  msg: string,
  error: string,
): HttpHandlerResponse => ({
  body: JSON.stringify({ error, error_description: msg }),
  headers: { },
  status: 400,
});
