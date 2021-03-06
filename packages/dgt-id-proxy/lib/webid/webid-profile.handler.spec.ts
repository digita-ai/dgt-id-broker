import fetchMock from 'jest-fetch-mock';
import { lastValueFrom } from 'rxjs';
import { WebIdProfileHandler } from './webid-profile.handler';

jest.mock('fs/promises', () => {

  const testJwks = {
    'keys': [
      {
        'crv': 'P-256',
        'x': 'ZXD5luOOClkYI-WieNfw7WGISxIPjH_PWrtvDZRZsf0',
        'y': 'vshKz414TtqkkM7gNXKqawrszn44OTSR_j-JxP-BlWo',
        'd': '07JS0yPt-fDABw_28JdENtlF0PTNMchYmfSXz7pRhVw',
        'kty': 'EC',
        'kid': 'Eqa03FG9Z7AUQx5iRvpwwnkjAdy-PwmUYKLQFIgSY5E',
        'alg': 'ES256',
        'use': 'sig',
      },
    ],
  };

  return {
    readFile: jest.fn().mockResolvedValue(Buffer.from(JSON.stringify(testJwks))),
  };

});

const idp = 'http://localhost:3003';

describe('WebIdProfileHandler', () => {

  const response = {
    body: {
      access_token: {
        header: {},
        payload: {
          webId: 'http://localhost:3002/alainvandam/profile/card#me',
          'sub': '123456789',
        },
      },
      id_token: {
        header: {},
        payload: {
          webid: 'http://localhost:3002/alainvandam/profile/card#me',
          'sub': '123456789',
          'username': '23121d3c-84df-44ac-b458-3d63a9a05497/|:$^?#{}[]',
          info: {
            'first_name': 'Alain',
            'family_name': 'Vandam',
          },
        },
      },
    },
    headers: {},
    status: 200,
  };

  const predicates: [string, string[]][] = [
    [ 'http://xmlns.com/foaf/0.1/givenName', [ 'info', 'fist_name' ] ],
    [ 'http://xmlns.com/foaf/0.1/familyName', [ 'info', 'family_name' ] ],
  ];

  const webIdPattern = 'http://localhost:3002/:sub/profile/card#me';

  const webIdProfileHandler = new WebIdProfileHandler('http://localhost:3002/clientapp/card#me', idp, 'assets/jwks.json', webIdPattern,  predicates);

  beforeAll(() => fetchMock.enableMocks());

  it('should be correctly instantiated', () => {

    expect(new WebIdProfileHandler('http://localhost:3002/clientapp/card#me', idp, 'assets/jwks.json', webIdPattern, predicates)).toBeTruthy();

  });

  it('should error when no webid was provided', () => {

    expect(() => new WebIdProfileHandler(undefined, idp, 'assets/jwks.json', webIdPattern, predicates)).toThrow('WebId is required');
    expect(() => new WebIdProfileHandler(null, idp, 'assets/jwks.json', webIdPattern, predicates)).toThrow('WebId is required');

  });

  it('should error when no idp was provided', () => {

    expect(() => new WebIdProfileHandler('http://digitaProxy.com/profile/card#me', undefined, 'assets/jwks.json', webIdPattern, predicates)).toThrow('An IDP URL is required');
    expect(() => new WebIdProfileHandler('http://digitaProxy.com/profile/card#me', null, 'assets/jwks.json', webIdPattern, predicates)).toThrow('An IDP URL is required');

  });

  it('should error when no path to jwks was provided', () => {

    expect(() => new WebIdProfileHandler('http://digitaProxy.com/profile/card#me', idp, undefined, webIdPattern, predicates)).toThrow('A path to JWKS is required');
    expect(() => new WebIdProfileHandler('http://digitaProxy.com/profile/card#me', idp, null, webIdPattern, predicates)).toThrow('A path to JWKS is required');

  });

  describe('handle', () => {

    it('should error when no response was provided', async () => {

      await expect(lastValueFrom(webIdProfileHandler.handle(undefined))).rejects.toThrow('A response must be provided');

    });

    it('should error when no response body was provided', async () => {

      await expect(lastValueFrom(webIdProfileHandler.handle({ ...response, body: undefined }))).rejects.toThrow('A response body must be provided');

    });

    it('should error when no response id token was provided', async () => {

      await expect(lastValueFrom(webIdProfileHandler.handle({ ...response, body: { ...response.body, id_token: undefined } }))).rejects.toThrow('An id token must be provided');

    });

    it('should error when no response body was provided', async () => {

      await expect(lastValueFrom(webIdProfileHandler.handle(
        { ...response, body:
          { ...response.body, id_token:
            { ...response.body.id_token, payload:
              { ...response.body.id_token.payload, webid: undefined } } } }
      ))).rejects.toThrow('A webId must be provided');

    });

    it('should create a profile and acl document when none exists', async () => {

      fetchMock.mockResponses([ 'Not found', { headers: { 'content-type':'text/turtle' }, status: 404 } ]);

      const generateProfileDocument = jest.spyOn(WebIdProfileHandler.prototype as any, 'generateProfileDocument');

      await lastValueFrom(webIdProfileHandler.handle(response));

      expect(generateProfileDocument).toHaveBeenCalledTimes(1);

      expect(generateProfileDocument)
        .toHaveBeenCalledWith(response.body.id_token.payload);

      expect(fetchMock.mock.calls[0]).toEqual([
        'http://localhost:3002/alainvandam/profile/card#me',
        { method: 'HEAD', headers: { Accept: 'text/turtle' } },
      ]);

      expect(fetchMock.mock.calls[1]).toEqual([
        'http://localhost:3002/alainvandam/profile/card',
        expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'text/turtle', Authorization: expect.stringMatching(new RegExp('^Bearer ey[a-zA-Z0-9]{0,}.ey[a-zA-Z0-9-._]{0,}$')) } }),
      ]);

      expect(fetchMock.mock.calls[2]).toEqual([
        'http://localhost:3002/alainvandam/profile/card.acl',
        expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'text/turtle', Authorization: expect.stringMatching(new RegExp('^Bearer ey[a-zA-Z0-9]{0,}.ey[a-zA-Z0-9-._]{0,}$')) } }),
      ]);

    });

    it('should straight return the response if profile document exist', async () => {

      fetchMock.once('Found', { headers: { 'content-type':'text/turtle' }, status: 200 });
      await expect(lastValueFrom(webIdProfileHandler.handle(response))).resolves.toEqual(response);

    });

    it('should do a HEAD request to the webId from the response to check if a document exists', async () => {

      await lastValueFrom(webIdProfileHandler.handle(response));

      expect(fetchMock).toHaveBeenCalledWith(response.body.id_token.payload.webid, {
        method: 'HEAD',
        headers: {
          Accept: 'text/turtle',
        },
      });

    });

    it('should call generateProfileDocument when none exists', async () => {

      fetchMock.once('Not found', { headers: { 'content-type':'text/turtle' }, status: 404 });

      const generateProfileDocument = jest.spyOn(WebIdProfileHandler.prototype as any, 'generateProfileDocument');

      await lastValueFrom(webIdProfileHandler.handle(response));

      expect(generateProfileDocument)
        .toHaveBeenCalledWith(response.body.id_token.payload);

    });

    it('should call generateAclDocument when none exists', async () => {

      fetchMock.once('Not found', { headers: { 'content-type':'text/turtle' }, status: 404 });

      const generateAclDocument = jest.spyOn(WebIdProfileHandler.prototype as any, 'generateAclDocument');

      await lastValueFrom(webIdProfileHandler.handle(response));

      expect(generateAclDocument)
        .toHaveBeenCalledWith(response.body.id_token.payload.webid);

    });

    it('should error when failed to create profile document', async () => {

      fetchMock.mockResponses([ 'Not found', { headers: { 'content-type':'text/turtle' }, status: 404 } ], [ 'Bad request: failed to create profile document', { headers: { 'content-type':'text/turtle' }, status: 400 } ]);

      await expect(() => lastValueFrom(webIdProfileHandler.handle(response))).rejects.toThrow('Failed to create a profile document');

    });

    it('should error when failed to create profile document', async () => {

      fetchMock.mockResponses([ 'Not found', { headers: { 'content-type':'text/turtle' }, status: 404 } ], [ '{}', { headers: { 'content-type':'text/turtle' }, status: 200 } ], [ 'Bad request: failed to create acl document', { headers: { 'content-type':'text/turtle' }, status: 400 } ]);

      await expect(() => lastValueFrom(webIdProfileHandler.handle(response))).rejects.toThrow('Failed to create ACL document');

    });

    it('should return the response unedited if webid in token does not match the webid pattern', async () => {

      const resp = { ... response, body: { ...response.body, id_token: { ...response.body.id_token, payload: { ...response.body.id_token.payload, webid: 'https://pods.digita.ai/test/profile/card#me' } } } };

      await expect(lastValueFrom(webIdProfileHandler.handle(resp))).resolves.toEqual(resp);

    });

  });

  describe('canHandle', () => {

    it('should return true when a response was provided', async () => {

      await expect(lastValueFrom(webIdProfileHandler.canHandle(response))).resolves.toEqual(true);

    });

    it('should return true when a response was provided', async () => {

      await expect(lastValueFrom(webIdProfileHandler.canHandle(undefined))).resolves.toEqual(false);
      await expect(lastValueFrom(webIdProfileHandler.canHandle(null))).resolves.toEqual(false);

    });

  });

});

