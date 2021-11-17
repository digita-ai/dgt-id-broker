import { brotliCompressSync, deflateSync, gzipSync } from 'zlib';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * A { HttpHandler } that handles compression for the client.
 */
export class ClientCompressionHandler extends HttpHandler {

  /**
   * Creates a { ClientCompressionHandler }
   *
   * @param { HttpHandler } handler - the handler to which to pass the context.
   */
  constructor(private handler: HttpHandler) {

    super();

    if (!handler) { throw new Error('A HttpHandler must be provided'); }

  }
  /**
   * Handles the context by remembering the "accept-encoding" header the client sent, and then
   * passing on the context to it's handler. When the handler returns a response, if the client
   * didn't send an "accept-encoding" header, returns the response unencoded. If the client did
   * send the "accept-encoding" header, encode the response according to the preferences in the
   * header, and return it.
   *
   * @param { HttpHandlerContext } context
   */
  handle(context: HttpHandlerContext): Observable<HttpHandlerResponse> {

    if (!context) { return throwError(new Error('Context cannot be null or undefined')); }

    if (!context.request) { return throwError(new Error('No request was included in the context')); }

    if (!context.request.headers) { return throwError(new Error('No headers were included in the request')); }

    const clientAcceptEncoding = context.request.headers['accept-encoding'];

    return this.handler.handle(context).pipe(

      map((response) => clientAcceptEncoding
        ? this.handleEncoding(response, this.retrieveEncoding(clientAcceptEncoding))
        : response),

    );

  }

  private retrieveEncoding(clientAcceptEncodingHeader: string): string {

    // Accepted encodings are presented in a comma seperated list and can contain q weights.
    // This line will remove the q weights and put them in a list.
    return clientAcceptEncodingHeader.split(',')
      .map((encodingType) => encodingType.trim().split(';')[0])
      .filter((encodingType) => encodingType !== 'compress')[0];

  }

  private handleEncoding(
    response: HttpHandlerResponse,
    encodingPossibilities: string,
  ): HttpHandlerResponse {

    if (response.body) {

      // Compress according to the first in the list as they are ordered by preference.
      switch (encodingPossibilities) {

        case 'br':
          response.body = brotliCompressSync(response.body);
          response.headers['content-encoding'] = 'br';
          break;
        case 'gzip':
          response.body = gzipSync(response.body);
          response.headers['content-encoding'] = 'gzip';
          break;
        case 'deflate':
          response.body = deflateSync(response.body);
          response.headers['content-encoding'] = 'deflate';
          break;
        // If nothing matches, just do nothing. Sending the response without encoding is always accepted.
        default:
          delete response.headers['content-encoding'];
          break;

      }

    } else delete response.headers['content-encoding'];

    return response;

  }

  /**
   * Specifies that if the context, context request, and context request headers are defined this handler can handle the response.
   *
   * @param {HttpHandlerContext} context
   */
  canHandle(context: HttpHandlerContext): Observable<boolean> {

    return context
      && context.request
      && context.request.headers
      ? of(true)
      : of(false);

  }

}
