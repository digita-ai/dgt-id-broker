import { request } from 'http';
import path from 'path';
import { ComponentsManager } from 'componentsjs';
import fetchMock from 'jest-fetch-mock';
import { NodeHttpServer } from '@digita-ai/handlersjs-http';
import { variables, mainModulePath, configPath } from '../setup-tests';

describe('full integration', () => {

  let manager: ComponentsManager<unknown>;
  let server: NodeHttpServer;
  const client_id = 'http://client.example.com/clientapp/profile';
  const redirect_uri = `http://client.example.com/requests.html`;

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

  variables['urn:dgt-id-proxy:variables:mainModulePath'] = path.join(__dirname, '../..');

  beforeAll(async () => {

    fetchMock.enableMocks();

    manager = await ComponentsManager.build({
      mainModulePath,
      logLevel: 'silly',
    });

    await manager.configRegistry.register(configPath);

    server = await manager.instantiate('urn:handlersjs-http:default:NodeHttpServer', { variables });
    await server.start().toPromise();

  });

  afterAll(() => {

    server.stop();

  });

  fit('should be able to', () => {

    const req = request(
      {
        host: 'localhost:3003',
        path: '',
        method: 'GET',
      },
      (response) => {

        expect(response.statusCode).toBe(200);

      }
    );

    req.end();

  });

  describe('GET /auth', () => {

    it('should', async () => {

      fetchMock.mockResponses([ clientRegistrationData, { headers: { 'content-type':'application/ld+json' }, status: 201 } ], [ JSON.stringify(mockRegisterResponse), { status: 200 } ]);

      const req = request(
        {
          host: 'localhost:3003',
          path: '/auth?response_type=code&code_challenge=F2IIZNXwqJIJwWHtmf3K7Drh0VROhtIY-JTRYWHUYQQ&code_challenge_method=S256&scope=openid&client_id=http%3A%2F%2Flocalhost%3A3002%2Fclientapp%2Fprofile&redirect_uri=http%3A%2F%2Flocalhost:3001%2Frequests.html',
          method: 'GET',
        },
      );

      req.end();

    });

  });

});
