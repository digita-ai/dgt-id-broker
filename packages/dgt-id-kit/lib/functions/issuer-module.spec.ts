import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { getIssuerConfig, validateIssuer, getDiscoveryInfo, getEndpoint } from './issuer-module';
enableFetchMocks();

describe('IssuerModule', () => {

  const requestUrl = 'http://not.a.site/';

  const invalidSolidOidcObject = {
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

  const validSolidOidcObject = {
    ...invalidSolidOidcObject,
    solid_oidc_supported: 'https://solidproject.org/TR/solid-oidc',
  };

  const mockedResponseInvalidSolidOidc = JSON.stringify(invalidSolidOidcObject);
  const mockedResponseValidSolidOidc = JSON.stringify(validSolidOidcObject);

  beforeEach(() => {

    fetchMock.resetMocks();

  });

  describe('getIssuerConfig()', () => {

    it('should return the config', async () => {

      fetchMock.mockResponseOnce(mockedResponseValidSolidOidc, { status: 200 });
      const result = getIssuerConfig(requestUrl);
      await expect(result).resolves.toEqual(validSolidOidcObject);

    });

    it('should error when issuer is undefined', async () => {

      const result = getIssuerConfig(undefined);
      await expect(result).rejects.toThrow('Parameter "issuer" should be set');

    });

    it('should error when there is no oidcConfig to get', async () => {

      fetchMock.mockResponseOnce('Not Found', { status: 404 });
      const result = getIssuerConfig(requestUrl);
      await expect(result).rejects.toThrow('No openid-configuration was found on this url: ');

    });

  });

  describe('validateIssuer()', () => {

  });

  describe('getDiscoveryInfo()', () => {

  });

  describe('getEndpoint()', () => {

  });

});
