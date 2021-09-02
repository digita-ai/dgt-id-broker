import nock = require('nock');
import { ComponentsManager } from 'componentsjs';
import fetchMock from 'jest-fetch-mock';
import { fromKeyLike, JWK, KeyLike } from 'jose/jwk/from_key_like';

import { generateKeyPair } from 'jose/util/generate_key_pair';
import { v4 as uuid } from 'uuid';
import { SignJWT } from 'jose/jwt/sign';
import { NodeHttpServer } from '@digita-ai/handlersjs-http';
import { variables, mainModulePath, configPath } from '../setup-tests';

describe('full integration', () => {

  let privateKey1: KeyLike;
  let privateKey2: KeyLike;
  let manager: ComponentsManager<unknown>;
  let server: NodeHttpServer;
  let validDpopJwt: string;
  let publicJwk1: JWK;
  let publicJwk2: JWK;
  const host = 'http://localhost:3003';
  const client_id = 'http://client.example.com/clientapp/profile';
  const publicClient_id = 'http://www.w3.org/ns/solid/terms#PublicOidcClient';
  const redirect_uri = `http://client.example.com/requests.html`;
  let authUrl: string;

  const clientRegistrationData = JSON.stringify({
    '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',

    client_id,
    'redirect_uris' : [ redirect_uri ],
    'client_name' : 'My Demo Application',
    'client_uri' : 'https://app.example/',
    'logo_uri' : 'https://app.example/logo.png',
    'tos_uri' : 'https://app.example/tos.html',
    'scope' : 'openid offline_access',
    'grant_types' : [ 'refresh_token', 'authorization_code' ],
    'response_types' : [ 'code' ],
    'default_max_age' : 60000,
    'require_auth_time' : true,
  });

  const mockRegisterResponse = {
    application_type: 'web',
    grant_types: [ 'refresh_token', 'authorization_code' ],
    client_name: 'My Demo Application',
    tos_uri : 'https://app.example/tos.html',
    require_auth_time : true,
    id_token_signed_response_alg: 'RS256',
    response_types: [ 'code' ],
    subject_type: 'public',
    token_endpoint_auth_method: 'none',
    client_id: 'GMRBBg-KZ0jt6VI6LXfOy',
    client_uri: 'https://app.example/',
    default_max_age: 60000,
    logo_uri: 'https://app.example/logo.png',
    redirect_uris: [ 'http://client.example.com/requests.html' ],
    registration_client_uri: 'http://server.example.com/reg/GMRBBg-KZ0jt6VI6LXfOy',
    registration_access_token: 'bsuodFwxgBWR3qE-pyxNeNbDhN1CWBs6oZuqkAooUgb',
  };

  const fetchURL = 'http://localhost:3000';

  const formDataForAccessToken = new URLSearchParams();
  formDataForAccessToken.set('grant_type', 'authorization_code');
  formDataForAccessToken.set('code', 'DafduCFHR-wyUF2Y3uY_T9TCQwvJ_O8AD5z2c8ksglY');
  formDataForAccessToken.set('client_id', client_id);
  formDataForAccessToken.set('redirect_uri', redirect_uri) ;
  formDataForAccessToken.set('code_verifier', 'FUZp7TTuXnFoVq7vjM4guXg-WUuevyOzEUSpxkDy1eWg3YgG.X5eEdNstK6iQDbgrsCd-rxkLM2xZL-5iNGIET90g8nAXLB81XAOBkAeRD1R37vlu~8hlAuKYj6AGuWq');

  const secondsSinceEpoch = () => Math.floor(Date.now() / 1000);

  const payload1 = {
    'jti': 'mockJti',
    'sub': 'mockSub',
    'iat': secondsSinceEpoch(),
    'exp': secondsSinceEpoch() + 7200,
    'scope': 'mockScope',
    'client_id': 'mockClient',
    'iss': 'http://mock-issuer.com',
    'aud': 'solid',
  };

  const header1 = {
    alg: 'ES256',
    typ: 'at+jwt',
    kid: 'mockKeyId',
  };

  beforeAll(async () => {

    fetchMock.enableMocks();

    authUrl = 'http://localhost:3003/auth?response_type=code&code_challenge=I-k6SDaSeVEgkBaUbk6E4UxFAyV8Mb_3NNSHf9q6Gu8&code_challenge_method=S256&scope=openid&client_id=http%3A%2F%2Fclient.example.com%2Fclientapp%2Fprofile&redirect_uri=http%3A%2F%2Fclient.example.com%2Frequests.html';

    const keyPair = await generateKeyPair('ES256');
    privateKey1 = keyPair.privateKey;
    privateKey2 = keyPair.privateKey;
    publicJwk1 = await fromKeyLike(keyPair.publicKey);
    publicJwk1.kid = 'mockKeyId';
    publicJwk1.alg = 'ES256';
    publicJwk2 = await fromKeyLike(keyPair.publicKey);
    publicJwk2.kid = 'mockKeyId';
    publicJwk2.alg = 'ES256';

    manager = await ComponentsManager.build({
      mainModulePath,
      logLevel: 'silly',
    });

    await manager.configRegistry.register(configPath);

    server = await manager.instantiate('urn:handlersjs-http:default:NodeHttpServer', { variables });

    await server.start().toPromise();

  });

  const mockedUpstreamJwt = async () => new SignJWT(payload1)
    .setProtectedHeader(header1)
    .sign(privateKey2);

  beforeEach(async () => {

    // DPoP-proofs
    validDpopJwt = await new SignJWT({
      'htm': 'POST',
      'htu': 'http://localhost:3003/token',
    })
      .setProtectedHeader({
        alg: 'ES256',
        typ: 'dpop+jwt',
        jwk: publicJwk1,
      })
      .setJti(uuid())
      .setIssuedAt()
      .sign(privateKey1);

  });

  afterAll(() => {

    server.stop();

  });

  describe('Auth flow ', () => {

    let params: URLSearchParams;
    let state: string;

    beforeEach(async () => {

      // prevents the next fetch request from being mocked, resumes normal mocking behaviour after
      fetchMock.dontMockOnce();

      // the first empty object is needed for the dontMockOnce (we dont't want to mock the very first fetch request below to the proxy)
      // the second one is the response to getting the clients registration data
      // the third one is the response from the register endpoint upon registering the client
      fetchMock.mockResponses(
        '{}',
        [ clientRegistrationData, { headers: { 'content-type':'application/ld+json' }, status: 200 } ],
        [ JSON.stringify(mockRegisterResponse), { status: 200 } ],
      );

      // the authentication request the proxy sends to the upstream server after passing it through all the necessary handlers
      const clientAuthReq = nock(fetchURL, { encodedQueryParams: true })
        .get(`/auth`)
        .query(true)
      // nock docs state you can't use arrow functions if you want to call this.req
      // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        .reply(function () {

          // this.req = the original request
          params = new URLSearchParams(host + this.req.path);
          state = params.get('state');

          return [ 302, 'found', { location: `http://localhost:3001/requests.html?code=DafduCFHR-wyUF2Y3uY_T9TCQwvJ_O8AD5z2c8ksglY&state=${state}` } ];

        });

      // mocks the redirect containing the code
      const code = nock('http://localhost:3001')
        .get('/requests.html')
        .query(true)
        .reply(200, 'succes');

      // the initial auth request to the proxy
      const response = await fetch(authUrl, {
        method: 'GET',
      });

    });

    it('should pass state to the endpoint in the params if not provided in the initial request', async () => {

      // check if state is present in the url params
      expect(state).toBeDefined();

    });

    it('should pass state to the endpoint in the if provided in the initial request', async () => {

      // add state to the intial request
      authUrl = 'http://localhost:3003/auth?response_type=code&code_challenge=I-k6SDaSeVEgkBaUbk6E4UxFAyV8Mb_3NNSHf9q6Gu8&code_challenge_method=S256&scope=openid&client_id=http%3A%2F%2Fclient.example.com%2Fclientapp%2Fprofile&redirect_uri=http%3A%2F%2Fclient.example.com%2Frequests.html&state=123456';

      expect(state).toBeDefined();

    });

    it('should replace the client-id with the one provided in the registration response', async () => {

      // check if the client-id is the one provided in the registration response instead of the one provided in the initial request
      expect(params.get('client_id')).toEqual(mockRegisterResponse.client_id);

    });

  });

  describe('token flow', () => {

    let reqBody: URLSearchParams;
    let initialRequest;

    beforeEach(async () => {

      const access_token = await mockedUpstreamJwt();
      const id_token = await mockedUpstreamJwt();

      const tokenResponseBody = JSON.stringify({
        access_token,
        expires_in: 7200,
        id_token,
        scope: 'mockScope',
        token_type: 'Bearer',
      });

      // mocks the proxy's token request to the upstream server
      const token = nock(fetchURL)
        .post('/token')
        .query(true)
        // docs said this does not work with arrow functions hence the line below
        // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        .reply(function (uri, body) {

          initialRequest = this.req;
          // console.log(this.req);
          // console.log(body);

          reqBody = new URLSearchParams(body.toString());

          return [ 200, tokenResponseBody, { 'content-type': 'application/json' } ];

        });

      // prevents the next fetch request from being mocked, resumes normal mocking behavior after
      fetchMock.dontMockOnce();

      // mocks the sequencal responses from the endpoints
      fetchMock.mockResponses(
        [ clientRegistrationData, { headers: { 'content-type':'application/ld+json' }, status: 200 } ],
        [ JSON.stringify({ jwks_uri: 'http://pathtojwks.com' }), { status: 200 } ],
        [ JSON.stringify({ keys: [ publicJwk2 ] }), { status: 200 } ]
      );

      // the initial token request to the proxy
      const response = await fetch('http://localhost:3003/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'DPoP': validDpopJwt,
        },
        body: formDataForAccessToken,
      });

    });

    it('should use the client-id from the registration response', async () => {

      expect(reqBody.get('client_id')).toEqual(mockRegisterResponse.client_id);

    });

    it('should have a recalculated content-length after switching the client id', async () => {

      expect(initialRequest.headers['content-length']).toEqual(Buffer.byteLength(reqBody.toString(), initialRequest.headers['content-type']).toString());

    });

    it('should not contain the code verifier in the query parameters', async () => {

      expect(reqBody.get('code_verifier')).toBeFalsy();

    });

    it('should contain the same redirect_uri as the one provided to the auth request', async () => {

      expect(reqBody.get('redirect_uri')).toEqual(redirect_uri);

    });

  });

});

