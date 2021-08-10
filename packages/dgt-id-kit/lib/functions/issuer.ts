import { DiscoveryField } from '../models/discovery-field.model';
import { DiscoveryStringEndpointField } from '../models/discovery-string-endpoint-field.model';
import { DiscoveryStringField } from '../models/discovery-string-field.model';
import { validateAndFetch } from './validate-and-fetch';

/**
 * Retrieve the openid-configuration of an issuer
 *
 * @param issuer the url of the oidc issuer
 * @returns the openid-configuration of the issuer as json
 */
export const getIssuerConfig = async (issuer: string): Promise<any> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  let jsonToReturn;

  try {

    const config = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    const response = await validateAndFetch(config);

    if (response.status !== 200) { throw new Error(`No openid-configuration was found on this url: "${config}"`); }

    jsonToReturn = await response.json();

  } catch (error: unknown) {

    throw new Error(`Something went wrong retrieving the openid-configuration: ${error}`);

  }

  return jsonToReturn;

};

/**
 * Validate if an issuer is solid-oidc compliant
 *
 * @param issuer The issuer you want to validate
 * @returns a boolean stating whether the issuer is valid or not
 */
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

/**
 * Get a specific discovery field from an issuers openid-configuration
 *
 * @param issuer the url to the issuer
 * @param field the discovery field you want to get
 * @returns the requested discovery field if present in the configuration
 */
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

/**
 * Retrieves an endpoint discovery field from the issuer's openid-configuration
 *
 * @param issuer the url to the issuer
 * @param endpoint which endpoint you want to retrieve
 * @returns the requested endpoint if present in the openid-configuration
 */
export const getEndpoint = async (issuer: string, endpoint: DiscoveryStringEndpointField): Promise<string> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!endpoint) { throw new Error('Parameter "endpoint" should be set'); }

  return await getDiscoveryInfo(issuer, endpoint);

};
