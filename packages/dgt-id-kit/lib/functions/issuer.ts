import { DiscoveryField } from '../models/discovery-field.model';
import { DiscoveryStringField } from '../models/discovery-string-field.model';

export const getIssuerConfig = async (issuer: string): Promise<any> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  const config = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
  const response = await fetch(config);

  if (response.status !== 200) { throw new Error(`No openid-configuration was found on this url: "${config}"`); }

  return await response.json();

};

export const validateIssuer = async (issuer: string): Promise<boolean> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  try {

    const config = await getIssuerConfig(issuer);

    if (config && config.solid_oidc_supported !== 'https://solidproject.org/TR/solid-oidc') {

      return false;

    }

    return true;

  } catch(error: unknown) { return false; }

};

export const getDiscoveryInfo =
async <T extends DiscoveryField>(issuer: string, field: T):
Promise<T extends DiscoveryStringField ? string : string[]> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!field) { throw new Error('Parameter "field" should be set'); }

  try {

    const config = await getIssuerConfig(issuer);

    return config[field];

  } catch (error: unknown) {

    throw new Error(`Something went wrong trying to get discoveryField: "${field}" from issuer: "${issuer}"`);

  }

};

export const getEndpoint = async (issuer: string, endpoint: DiscoveryStringField): Promise<string> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!endpoint) { throw new Error('Parameter "endpoint" should be set'); }

  if (!endpoint.endsWith('_endpoint')) { throw new Error('Parameter "endpoint" should end in "_endpoint"'); }

  return await getDiscoveryInfo(issuer, endpoint);

};
