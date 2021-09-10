import { DiscoveryEndpointField } from './discovery-endpoint-field.model';

/**
 * Consist of all OIDC discovery fields that return a string
 */
export type DiscoveryStringField =
  DiscoveryEndpointField |
  'issuer' |
  'jwks_uri' |
  'service_documentation' |
  'claims_parameter_supported' |
  'request_parameter_supported' |
  'request_uri_parameter_supported' |
  'require_request_uri_registration' |
  'op_policy_uri' |
  'op_tos_uri' |
  'solid_oidc_supported';
