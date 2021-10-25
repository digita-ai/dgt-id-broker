import fetchMock from 'jest-fetch-mock';
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

describe('WebIdProfileHandler', () => {

  const response = {
    body: {
      access_token: {
        header: {},
        payload: {
          webId: 'http://example.com/examplename/profile/card#me',
          'sub': '123456789',
        },
      },
      id_token: {
        header: {},
        payload: {
          webId: 'http://example.com/examplename/profile/card#me',
          'sub': '123456789',
          'username': '23121d3c-84df-44ac-b458-3d63a9a05497/|:$^?#{}[]',
          'first_name': 'Tony',
          'family_name': 'Paillard',
        },
      },
    },
    headers: {},
    status: 200,
  };

  const predicates = [
    { tokenKey: 'first_name', predicate: 'http://xmlns.com/foaf/0.1/givenName' },
    { tokenKey: 'family_name', predicate: 'http://xmlns.com/foaf/0.1/familyName' },
  ];

  const webIdProfileHandler = new WebIdProfileHandler(predicates, 'http://digitaProxy.com/profile/card#me', 'assets/jwks.json');

  beforeAll(() => fetchMock.enableMocks());

  it('should be correctly instantiated', () => {

    expect(new WebIdProfileHandler(predicates, 'http://digitaProxy.com/profile/card#me', 'assets/jwks.json')).toBeTruthy();

  });

  it('should error when no predicates are provided', () => {

    expect(() => new WebIdProfileHandler(undefined, 'http://digitaProxy.com/profile/card#me', 'assets/jwks.json')).toThrow('Predicate list is required');
    expect(() => new WebIdProfileHandler(null, 'http://digitaProxy.com/profile/card#me', 'assets/jwks.json')).toThrow('Predicate list is required');

  });

  it('should error when no proxy webid was provided', () => {

    expect(() => new WebIdProfileHandler(predicates, undefined, 'assets/jwks.json')).toThrow('WebId is required');
    expect(() => new WebIdProfileHandler(predicates, null, 'assets/jwks.json')).toThrow('WebId is required');

  });

  it('should error when no path to jwks was provided', () => {

    expect(() => new WebIdProfileHandler(predicates, 'http://digitaProxy.com/profile/card#me', undefined)).toThrow('Path to JWKS is required');
    expect(() => new WebIdProfileHandler(predicates, 'http://digitaProxy.com/profile/card#me', null)).toThrow('Path to JWKS is required');

  });

  describe('handle', () => {

    it('should error when no response was provided', async () => {

      await expect(webIdProfileHandler.handle(undefined).toPromise()).rejects.toThrow('A response must be provided');

    });

    it('should create a profile and acl document when none exists', async () => {

      fetchMock.mockResponses([ 'Not found', { headers: { 'content-type':'text/turtle' }, status: 404 } ]);

      const generateProfileDocument = jest.spyOn(WebIdProfileHandler.prototype as any, 'generateProfileDocument');

      await webIdProfileHandler.handle(response).toPromise();

      expect(generateProfileDocument).toHaveBeenCalledTimes(1);

      expect(generateProfileDocument)
        .toHaveBeenCalledWith(response.body.id_token);

      expect(fetchMock.mock.calls[0]).toEqual([
        'http://example.com/examplename/profile/card#me',
        { method: 'HEAD', headers: { Accept: 'text/turtle' } },
      ]);

      expect(fetchMock.mock.calls[1]).toEqual([
        'http://example.com/examplename/profile/card#me',
        expect.objectContaining({ method: 'PUT', headers: { Accept: 'text/turtle', Authorization: expect.stringMatching(new RegExp('^Bearer ey[a-zA-Z0-9]{108}.ey[a-zA-Z0-9._-]{297}$')) } }),
      ]);

      expect(fetchMock.mock.calls[2]).toEqual([
        'http://example.com/examplename/profile/card.acl',
        expect.objectContaining({ method: 'PUT', headers: { Accept: 'text/turtle', Authorization: expect.stringMatching(new RegExp('^Bearer ey[a-zA-Z0-9]{108}.ey[a-zA-Z0-9._-]{297}$')) } }),
      ]);

    });

    it('should straight return the response if profile document exist', async () => {

      fetchMock.once('Found', { headers: { 'content-type':'text/turtle' }, status: 200 });
      await expect(webIdProfileHandler.handle(response).toPromise()).resolves.toEqual(response);

    });

    it('should do a HEAD request to the webId from the response to check if a document exists', async () => {

      await webIdProfileHandler.handle(response).toPromise();

      expect(fetchMock).toHaveBeenCalledWith(response.body.id_token.payload.webId, {
        method: 'HEAD',
        headers: {
          Accept: 'text/turtle',
        },
      });

    });

    it('should call generateProfileDocument when none exists', async () => {

      fetchMock.once('Not found', { headers: { 'content-type':'text/turtle' }, status: 404 });

      const generateProfileDocument = jest.spyOn(WebIdProfileHandler.prototype as any, 'generateProfileDocument');

      await webIdProfileHandler.handle(response).toPromise();

      expect(generateProfileDocument)
        .toHaveBeenCalledWith(response.body.id_token);

    });

    it('should call generateAclDocument when none exists', async () => {

      fetchMock.once('Not found', { headers: { 'content-type':'text/turtle' }, status: 404 });

      const generateAclDocument = jest.spyOn(WebIdProfileHandler.prototype as any, 'generateAclDocument');

      await webIdProfileHandler.handle(response).toPromise();

      expect(generateAclDocument)
        .toHaveBeenCalledWith(response.body.id_token);

    });

    it('should error when failed to create profile document', async () => {

      fetchMock.mockResponses([ 'Not found', { headers: { 'content-type':'text/turtle' }, status: 404 } ], [ 'Bad request: failed to create profile document', { headers: { 'content-type':'text/turtle' }, status: 400 } ]);

      await expect(() => webIdProfileHandler.handle(response).toPromise()).rejects.toThrow('Failed to create a profile document');

    });

    it('should error when failed to create profile document', async () => {

      fetchMock.mockResponses([ 'Not found', { headers: { 'content-type':'text/turtle' }, status: 404 } ], [ '{}', { headers: { 'content-type':'text/turtle' }, status: 200 } ], [ 'Bad request: failed to create acl document', { headers: { 'content-type':'text/turtle' }, status: 400 } ]);

      await expect(() => webIdProfileHandler.handle(response).toPromise()).rejects.toThrow('Failed to create Acl document');

    });

  });

  describe('canHandle', () => {

    it('should return true when a response was provided', async () => {

      await expect(webIdProfileHandler.canHandle(response).toPromise()).resolves.toEqual(true);

    });

    it('should return true when a response was provided', async () => {

      await expect(webIdProfileHandler.canHandle(undefined).toPromise()).resolves.toEqual(false);
      await expect(webIdProfileHandler.canHandle(null).toPromise()).resolves.toEqual(false);

    });

  });

});

