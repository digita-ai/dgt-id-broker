import { HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, Observable } from 'rxjs';

export const createErrorResponse = (
  msg: string,
  context: HttpHandlerContext,
  error: string,
): Observable<HttpHandlerResponse> => of(
  {
    body: JSON.stringify({ error, error_description: msg }),
    headers: { 'access-control-allow-origin': context.request.headers.origin },
    status: 400,
  },
);

export type Code = string;
export interface ChallengeAndMethod { challenge: string; method: string; clientState?: string }
