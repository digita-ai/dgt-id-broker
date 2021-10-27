import nock = require('nock');
import { ComponentsManager } from 'componentsjs';
import fetchMock from 'jest-fetch-mock';
import { fromKeyLike, JWK, KeyLike } from 'jose/jwk/from_key_like';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { v4 as uuid } from 'uuid';
import { SignJWT } from 'jose/jwt/sign';
import { NodeHttpServer } from '@digita-ai/handlersjs-http';
import { decode } from 'jose/util/base64url';
import { variables, mainModulePath, configPath } from '../setup-tests';

describe('full integration', () => {

  let privateKey1: KeyLike;
  let privateKey2: KeyLike;
  let manager: ComponentsManager<unknown>;
  let server: NodeHttpServer;
  let validDpopJwt: string;
  let publicJwk1: JWK;
  let publicJwk2: JWK;
  const client_id = 'http://client.example.com/clientapp/profile';
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

  const upstreamUrl = 'http://localhost:3000';
  const proxyUrl = 'http://localhost:3003';

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
    'aud': 'mockAud',
  };

  const header1 = {
    alg: 'ES256',
    typ: 'at+jwt',
    kid: 'mockKeyId',
  };

  const mockedUpstreamJwt = async () => new SignJWT(payload1)
    .setProtectedHeader(header1)
    .sign(privateKey2);

  beforeAll(async () => {

    fetchMock.enableMocks();

    authUrl = `${proxyUrl}/auth?response_type=code&code_challenge=I-k6SDaSeVEgkBaUbk6E4UxFAyV8Mb_3NNSHf9q6Gu8&code_challenge_method=S256&scope=openid&client_id=http%3A%2F%2Fclient.example.com%2Fclientapp%2Fprofile&redirect_uri=http%3A%2F%2Fclient.example.com%2Frequests.html`;

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

  beforeEach(async () => {

    // generate DPoP-proofs
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

  afterAll(async () => {

    await server.stop().toPromise();

  });

  describe('Auth flow ', () => {

    let params: URLSearchParams;
    let state: string;
    let response: Response;

    beforeAll(async () => {

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
      const clientAuthReq = nock(upstreamUrl, { encodedQueryParams: true })
        .get(`/auth`)
        .query(true)
      // nock docs state you can't use arrow functions if you want to call this.req
      // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        .reply(function () {

          // this.req = the original request
          // console.log(this.req);
          params = new URLSearchParams(this.req.path.split('?')[1]);
          state = params.get('state');

          // mock the upstream response from the auth endpoint
          return [ 302, 'found', { location: `http://localhost:3001/requests.html?code=DafduCFHR-wyUF2Y3uY_T9TCQwvJ_O8AD5z2c8ksglY&state=${state}` } ];

        });

      // mocks the redirect containing the code
      const code = nock('http://localhost:3001')
        .get('/requests.html')
        .query(true)
        .reply(200, 'success');

      // the initial auth request to the proxy
      response = await fetch(authUrl, {
        method: 'GET',
      });

    });

    describe('checking auth parameters incoming at the upstream server after passing the proxy', () => {

      it('should still contain the same scope', () => {

        expect(params.get('scope')).toBeTruthy();
        expect(params.get('scope')).toEqual('openid');

      });

      it('should still contain the same response_type', () => {

        expect(params.get('response_type')).toBeTruthy();
        expect(params.get('response_type')).toEqual('code');

      });

      it('should still contain client_id', () => {

        expect(params.get('client_id')).toBeTruthy();

      });

      it('should replace the client-id with the one provided in the registration response', () => {

        // check if the client-id is the one provided in the registration response instead of the one provided in the initial request
        expect(params.get('client_id')).toEqual(mockRegisterResponse.client_id);

      });

      it('should still contain the same redirect_uri', () => {

        expect(params.get('redirect_uri')).toBeTruthy();
        expect(params.get('redirect_uri')).toEqual(redirect_uri);

      });

      it('should pass state to the endpoint in the params if not provided in the initial request', () => {

        // check if state is present in the url params of the initial request
        expect(state).toBeDefined();
        // check if state is 36 digits (like uuids)
        expect(state.length).toBe(36);

      });

      it('should not contain the code_challenge & code_challenge_method', () => {

        expect(params.get('code_challenge')).toBeFalsy();
        expect(params.get('code_challenge_method')).toBeFalsy();

      });

    });

    describe('checking parameters coming from the upstream server outgoing to the client after passing the proxy', () => {

      it('should not contain state as a url parameter anymore if none was provided in the initial request', () => {

        expect(response.url).toEqual('http://localhost:3001/requests.html?code=DafduCFHR-wyUF2Y3uY_T9TCQwvJ_O8AD5z2c8ksglY');

      });

      it('should contain a code ', () => {

        const paramsAtClient = new URLSearchParams(response.url.split('?')[1]);

        expect(paramsAtClient.get('code')).toBeTruthy();

      });

    });

  });

  describe('token flow', () => {

    let reqBody: URLSearchParams;
    let initialRequest;
    let response: Response;

    beforeAll(async () => {

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
      const token = nock(upstreamUrl)
        .post('/token')
        .query(true)
        // docs said this does not work with arrow functions hence the line below
        // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        .reply(function (uri, body) {

          initialRequest = this.req;

          reqBody = new URLSearchParams(body.toString());

          return [ 200, tokenResponseBody, { 'content-type': 'application/json' } ];

        });

      // prevents the next fetch request from being mocked, resumes normal mocking behavior after
      fetchMock.dontMockOnce();

      // mocks the sequential responses from the endpoints
      fetchMock.mockResponses(
        [ clientRegistrationData, { headers: { 'content-type':'application/ld+json' }, status: 200 } ],
        [ JSON.stringify({ jwks_uri: 'http://pathtojwks.com' }), { status: 200 } ],
        [ JSON.stringify({ keys: [ publicJwk2 ] }), { status: 200 } ],
      );

      // the initial token request to the proxy
      response = await fetch('http://localhost:3003/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'DPoP': validDpopJwt,
        },
        body: formDataForAccessToken,
      });

    });

    describe('checking token parameters incoming at the upstream server after passing the proxy', () => {

      it('should contain client_id in the body parameters', () => {

        expect(reqBody.get('client_id')).toBeDefined();

      });

      it('should use the client-id from the registration response', () => {

        // check that the client id is the one from the registration response
        expect(reqBody.get('client_id')).toEqual(mockRegisterResponse.client_id);

      });

      it('should contain grant_type in the body parameters', () => {

        expect(reqBody.get('grant_type')).toBeDefined();
        expect(reqBody.get('grant_type')).toEqual('authorization_code');

      });

      it('should contain code in the body parameters', () => {

        expect(reqBody.get('code')).toBeDefined();

      });

      it('should contain redirect_uri in the body parameters', () => {

        expect(reqBody.get('redirect_uri')).toBeDefined();

      });

      it('should contain the same redirect_uri as the one provided to the auth request', () => {

        // check that the redirect_uri is the same as the one provided in the initial request
        expect(reqBody.get('redirect_uri')).toEqual(redirect_uri);

      });

      it('should have a recalculated content-length after switching the client id', () => {

        // check that the content-length has been recalculated after switching the client id with the client id from the registration response
        expect(initialRequest.headers['content-length']).toEqual(Buffer.byteLength(reqBody.toString(), initialRequest.headers['content-type']).toString());

      });

      it('should not contain the code verifier in the query parameters', () => {

        // check that the code verifier is removed from the query parameters
        expect(reqBody.get('code_verifier')).toBeFalsy();

      });

      it('should not contain a DPoP token header if one was provided in the initial request', () => {

        expect(initialRequest.headers.dpop).toBeFalsy();

      });

    });

    describe('checking token response parameters coming from the upstream server going to the client after passing the proxy', () => {

      let responseBodyJSON;

      let access_token: string;
      let decodedHeaderAccessToken;
      let decodedPayloadAccessToken;

      let id_token: string;
      let decodedHeaderIdToken;
      let decodedPayloadIdToken;

      beforeAll(async () => {

        responseBodyJSON = await response.json();

        access_token = responseBodyJSON.access_token;
        decodedHeaderAccessToken = JSON.parse(decode(access_token.split('.')[0]).toString());
        decodedPayloadAccessToken = JSON.parse(decode(access_token.split('.')[1]).toString());

        id_token = responseBodyJSON.id_token;
        decodedHeaderIdToken = JSON.parse(decode(id_token.split('.')[0]).toString());
        decodedPayloadIdToken = JSON.parse(decode(id_token.split('.')[1]).toString());

      });

      it('should have an access token with an expiration time of 2 hours', async () => {

        expect(responseBodyJSON.expires_in).toEqual(7200);

      });

      it('should have a token_type of DPoP', () => {

        expect(responseBodyJSON.token_type).toEqual('DPoP');

      });

      it('should contain JWT tokens with valid lengths', async () => {

        const splitAccessToken = access_token.split('.');
        expect(splitAccessToken.length).toBeGreaterThan(2);
        const splitIDToken = access_token.split('.');
        expect(splitIDToken.length).toBeGreaterThan(2);

      });

      describe('checking access token parameters', () => {

        it('should have a kid header that contains the correct kid', () => {

          expect(decodedHeaderAccessToken.kid).toBeDefined();
          expect(decodedHeaderAccessToken.kid).not.toEqual('mockKeyId');
          expect(decodedHeaderAccessToken.kid).toEqual('Eqa03FG9Z7AUQx5iRvpwwnkjAdy-PwmUYKLQFIgSY5E');

        });

        it('should contain an alg header of ES256', () => {

          expect(decodedHeaderAccessToken.alg).toBeDefined();
          expect(decodedHeaderAccessToken.alg).toEqual('ES256');

        });

        it('should contain the correct client id', () => {

          expect(decodedPayloadAccessToken.client_id).toEqual(client_id);

        });

        it('should contain a correct minted webid as webid claim', () => {

          expect(decodedPayloadAccessToken.webid).toEqual(`http://localhost:3002/clientapp/${payload1.sub}/profile/card#me`);

        });

        it('should contain a aud claim with solid audience', () => {

          expect(decodedPayloadAccessToken.aud).toContain('solid');

        });

        it('should contain a correct jti claim and of the correct length', () => {

          expect(decodedPayloadAccessToken.jti).toBeTruthy();
          expect(decodedPayloadAccessToken.jti.length).toEqual(36); // correct length of a 4 UUID
          expect(decodedPayloadAccessToken.jti).not.toEqual('mockJti');

        });

        it('should contain iss claim with a valid URL of the proxy', () => {

          expect(decodedPayloadAccessToken.iss).toEqual(proxyUrl);

        });

        it('should contain iat and exp claims', () => {

          expect(decodedPayloadAccessToken.iat).toBeDefined();
          expect(decodedPayloadAccessToken.exp).toBeDefined();

        });

        it('should contain a cnf claim containing a jkt', () => {

          expect(decodedPayloadAccessToken.cnf).toBeTruthy();
          expect(decodedPayloadAccessToken.cnf.jkt).toBeTruthy();

        });

      });

      describe('checking id_token parameters', () => {

        it('should have a kid header that contains the correct kid', () => {

          expect(decodedHeaderIdToken.kid).toBeDefined();
          expect(decodedHeaderIdToken.kid).not.toEqual('mockKeyId');
          expect(decodedHeaderIdToken.kid).toEqual('Eqa03FG9Z7AUQx5iRvpwwnkjAdy-PwmUYKLQFIgSY5E');

        });

        it('should contain a typ header of jwt', () => {

          expect(decodedHeaderIdToken.typ).toBeDefined();
          expect(decodedHeaderIdToken.typ).toEqual('JWT');

        });

        it('should contain an alg header of ES256', () => {

          expect(decodedHeaderIdToken.alg).toBeDefined();
          expect(decodedHeaderIdToken.alg).toEqual('ES256');

        });

        it('should contain a correct minted webid claim', () => {

          expect(decodedPayloadIdToken.webid).toEqual(`http://localhost:3002/clientapp/${payload1.sub}/profile/card#me`);

        });

        it('should contain a correct jti claim and of the correct length', () => {

          expect(decodedPayloadIdToken.jti).toBeTruthy();
          expect(decodedPayloadIdToken.jti.length).toEqual(36); // correct length of a 4 UUID
          expect(decodedPayloadIdToken.jti).not.toEqual('mockJti');

        });

      });

    });

  });

});

