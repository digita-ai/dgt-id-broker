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

export const profileInvalidQuads = `
  ${prefixes}
    ${typeindexesTurtle}
    foaf:name "name"
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

export const WithoutEndpointsObject = {
  ...validSolidOidcObject,
  authorization_endpoint: undefined,
  token_endpoint: undefined,
};

export const mockedResponseInvalidSolidOidc = JSON.stringify(invalidSolidOidcObject);
export const mockedResponseValidSolidOidc = JSON.stringify(validSolidOidcObject);
export const mockedResponseWithoutEndpoints = JSON.stringify(WithoutEndpointsObject);

export const dummyValidAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuYXV0aDAuY29tLyIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tL2NhbGFuZGFyL3YxLyIsInN1YiI6InVzcl8xMjMiLCJpYXQiOjE0NTg3ODU3OTYsImV4cCI6MTk1ODg3MjE5Nn0.dvucn5Zv86HBKJyhTsk7-AWv_ldwiyeXsKnzs6NhErY';
export const dummyExpiredAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuYXV0aDAuY29tLyIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tL2NhbGFuZGFyL3YxLyIsInN1YiI6InVzcl8xMjMiLCJpYXQiOjE0NTg3ODU3OTYsImV4cCI6MTQ1ODg3MjE5Nn0.CA7eaHjIHz5NxeIJoFK9krqaeZrPLwmMmgI_XiQiIkQ';

export const issuer = 'http://issuer.com';
export const clientId = 'clientId';
export const codeChallenge = 'pkceCodeChallenge';
export const codeVerifier = 'MockOfACodeVerifierThatIsAtLeast43CharactersLong';
export const scope = 'scopeopenid';
export const redirectUri = 'https://redirect.uri';
export const webId = 'https://web.id';
export const authorizationCode = 'authorizationCode';
export const refreshToken = 'refreshToken';
export const idToken = 'idToken';
export const resource = 'http://resource.com';
export const method = 'GET';
export const clientSecret = 'clientSecret';
export const body = 'body';
export const contentType = 'contentType';
export const responseType = 'responseType';
export const state = 'mockState';

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const handleAuthRequestUrl = async (url: string): Promise<void> => { };

export const getAuthorizationCode = async (): Promise<string> => authorizationCode;
