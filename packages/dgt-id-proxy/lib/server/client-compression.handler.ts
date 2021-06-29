import { brotliCompressSync, deflateSync, gzipSync } from 'zlib';
import { HttpHandler, HttpHandlerContext, HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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
      switchMap((response) => clientAcceptEncoding ? this.handleEncoding(response, clientAcceptEncoding) : of(response))
    );

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

  private handleEncoding(
    response: HttpHandlerResponse,
    clientAcceptEncodingHeader: string
  ): Observable<HttpHandlerResponse> {

    // Accepted encodings are presented in a comma seperated list and can contain q weights. This line will remove the q weights and put them in a list.
    const encodingPossibilities = clientAcceptEncodingHeader.split(',').map((encodingType) => {

      // Remove excess spaces
      encodingType = encodingType.trim();

      return encodingType.split(';')[0];

      // Remove 'compress' from the list

    }).filter((encodingType) => encodingType !== 'compress');

    // We don't support "compress", so if only "compress" was requested and filtered out, send the response back without encoding
    if (encodingPossibilities.length === 0) { return of(response); }

    // Compress according to the first in the list as they are ordered by preference.
    switch (encodingPossibilities[0]) {

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

    return of(response);

  }

}
