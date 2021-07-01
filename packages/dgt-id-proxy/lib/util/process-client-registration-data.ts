import { OidcClientMetadata } from './oidc-client-metadata';

/**
 * Performs a get request to retrieve the client registration file
 *
 * @param { string } client id
 */
export const getClientRegistrationData = async (clientid: string): Promise<Partial<OidcClientMetadata>> =>{

  const data = await fetch(clientid, {
    method: 'GET',
    headers: {
      Accept: 'application/ld+json',
    },
  });

  if (data.headers.get('content-type') !== ('application/ld+json')) {  throw new Error(`Incorrect content-type: expected application/ld+json but got ${data.headers.get('content-type')}`); }

  const dataJSON = await data.json();

  if (!dataJSON['@context']) { throw new Error('client registration data should use the normative JSON-LD @context'); }

  return dataJSON;

};

