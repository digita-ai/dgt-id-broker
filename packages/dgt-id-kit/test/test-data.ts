import { Parser } from 'n3';

const parser = new Parser();

export const requestUrl = 'http://url.com';
export const issuer1 = { url: new URL('http://mock-issuer.com/') };
export const issuer2 = { url: new URL('http://mocked-issuer.com/') };

const prefixes = `
  @prefix : <#>.
  @prefix solid: <http://www.w3.org/ns/solid/terms#>.
  @prefix foaf: <http://xmlns.com/foaf/0.1/>.
  @prefix pro: <./>.
`;

const profileTurtle = `
  pro:card a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.
`;

export const plainProfile = `
  ${prefixes}
  ${profileTurtle}
  :me
    foaf:name "name".
`;

export const plainProfileQuads = parser.parse(plainProfile);

export const issuersTurtle = `
  solid:oidcIssuer <${issuer1.url.toString()}>;
  solid:oidcIssuer <${issuer2.url.toString()}>;
`;

export const typeindexesTurtle = `
  solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
  solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
`;

export const profileWithIssuers = `
  ${prefixes}
  ${profileTurtle}
  :me
    ${typeindexesTurtle}
    ${issuersTurtle}
    foaf:name "name".
`;

export const profileWithIssuersQuads = parser.parse(profileWithIssuers);

export const profileWithNoIssuers = `
  ${prefixes}
  ${profileTurtle}
  :me
    ${typeindexesTurtle}
    foaf:name "name".
`;

export const profileWithNoIssuersQuads = parser.parse(profileWithNoIssuers);

export const profileInvalid = `
  ${prefixes}
  :me
    ${typeindexesTurtle}
    foaf:name "name".
`;

export const invalidSolidOidcObject = {
  issuer: 'https://inrupt.net',
  jwks_uri: 'https://inrupt.net/jwks',
  response_types_supported: [ 'code', 'code token', 'code id_token', 'id_token code', 'id_token', 'id_token token', 'code id_token token', 'none' ],
  token_types_supported: [ 'legacyPop', 'dpop' ],
  response_modes_supported:[ 'query', 'fragment' ],
  grant_types_supported: [ 'authorization_code', 'implicit', 'refresh_token', 'client_credentials' ],
  subject_types_supported: [ 'public' ],
  id_token_signing_alg_values_supported: [ 'RS256' ],
  token_endpoint_auth_methods_supported: 'client_secret_basic',
  token_endpoint_auth_signing_alg_values_supported: [ 'RS256' ],
  display_values_supported: [],
  claim_types_supported: [ 'normal' ],
  claims_supported: [],
  claims_parameter_supported: false,
  request_parameter_supported: true,
  request_uri_parameter_supported: false,
  require_request_uri_registration: false,
  check_session_iframe: 'https://inrupt.net/session',
  end_session_endpoint: 'https://inrupt.net/logout',
  authorization_endpoint: 'https://inrupt.net/authorize',
  token_endpoint: 'https://inrupt.net/token',
  userinfo_endpoint: 'https://inrupt.net/userinfo',
  registration_endpoint: 'https://inrupt.net/register',
};

export const validSolidOidcObject = {
  ...invalidSolidOidcObject,
  solid_oidc_supported: 'https://solidproject.org/TR/solid-oidc',
};

export const mockedResponseInvalidSolidOidc = JSON.stringify(invalidSolidOidcObject);
export const mockedResponseValidSolidOidc = JSON.stringify(validSolidOidcObject);
