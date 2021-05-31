export interface RegistrationResponseJSON {
  client_sceret: string;
  registration_access_token: string;
  registration_client_uri: string;
  require_signed_request_object: boolean;
  client_secret_expires_at: number;
  post_logout_redirect_uris: string[];
  client_id_issued_at: number;
}
