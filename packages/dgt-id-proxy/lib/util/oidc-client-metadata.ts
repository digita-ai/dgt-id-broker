/**
 * An interface that presents all data that is possible in a registration request
 */
export interface OidcClientMetadata {
  client_id: string;
  response_types: string[];
  redirect_uris: string[];
  grant_types: string[];
  application_type: string;
  contacts: string;
  client_name: string;
  logo_uri: string;
  client_uri: string;
  policy_uri: string;
  tos_uri: string;
  jwks_uri: string;
  jwks: string;
  sector_identifier_uri: string;
  subject_type: string;
  id_token_signed_response_alg: string;
  id_token_encrypted_response_alg: string;
  id_token_encrypted_response_enc: string;
  userinfo_signed_response_alg: string;
  userinfo_encrypted_response_alg: string;
  userinfo_encrypted_response_enc: string;
  request_object_signing_alg: string;
  request_object_encryption_alg: string;
  request_object_encryption_enc: string;
  token_endpoint_auth_method: string;
  token_endpoint_auth_signing_alg: string;
  default_max_age: number;
  require_auth_time: boolean;
  default_acr_values: string;
  initiate_login_uri: string;
  request_uris: string[];
}
