
import { HttpHandlerRequest } from '@digita-ai/handlersjs-http';

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

