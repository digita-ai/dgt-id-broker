import { HttpHandlerRequest } from '@digita-ai/handlersjs-http';

/**
 * Checks what char type is in the request header 'Content-Type'.
 * Checks if the charset is supported. If no charset is present it set utf-8 as default.
 * Recalculates the content-length of the request since it has been changed by the proxy.
 *
 * @param { HttpHandlerRequest } request
 * @returns The newly calculated content-type length
 */
export const recalculateContentLength = (request: HttpHandlerRequest): string => {

  const contentTypeHeader = request.headers['content-type'];

  const charsetString = contentTypeHeader ? contentTypeHeader.split(';')
    .filter((part) => part.includes('charset='))
    .map((part) => part.split('=')[1].toLowerCase())[0]
    ?? 'utf-8' : 'utf-8';

  if (charsetString !== 'ascii' && charsetString !== 'utf8' && charsetString !== 'utf-8' && charsetString !== 'utf16le' && charsetString !== 'ucs2' && charsetString !== 'ucs-2' && charsetString !== 'base64' && charsetString !== 'latin1' && charsetString !== 'binary' && charsetString !== 'hex') {

    throw new Error('The specified charset is not supported');

  }

  return Buffer.byteLength(request.body, charsetString).toString();

};
