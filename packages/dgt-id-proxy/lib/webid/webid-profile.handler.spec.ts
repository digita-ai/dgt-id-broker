
import fetchMock from 'jest-fetch-mock';
import { WebIdProfileHandler } from './webid-profile.handler';

describe('WebIdProfileHandler', () => {

  const webIdContent = `@prefix foaf: <http://xmlns.com/foaf/0.1/>.
  @prefix solid: <http://www.w3.org/ns/solid/terms#>.
  
  <http://solid.community.com/23121d3c-84df-44ac-b458-3d63a9a05497dollar/profile/card#me> foaf:PersonalProfileDocument "";
      foaf:maker "http://solid.community.com/23121d3c-84df-44ac-b458-3d63a9a05497dollar/profile/card#me";
      foaf:primaryTopic "http://solid.community.com/23121d3c-84df-44ac-b458-3d63a9a05497dollar/profile/card#me";
      foaf:given_name "Tony";
      foaf:family_name "Paillard".`;

  const response = {
    body: {
      access_token: {
        header: {},
        payload: {
          webId: 'http://solid.community.com/23121d3c-84df-44ac-b458-3d63a9a05497dollar/profile/card#me',
          'sub': '123456789',
        },
      },
      id_token: {
        header: {},
        payload: {
          webId: 'http://solid.community.com/23121d3c-84df-44ac-b458-3d63a9a05497dollar/profile/card#me',
          'sub': '123456789',
          'username': '23121d3c-84df-44ac-b458-3d63a9a05497/|:$^?#{}[]',
          'given_name': 'Tony',
          'family_name': 'Paillard',
        },
      },
    },
    headers: {},
    status: 200,
  };

  const predicates = [
    { tokenKey: 'http://xmlns.com/foaf/0.1/PersonalProfileDocument', predicate: '' },
    { tokenKey: 'http://xmlns.com/foaf/0.1/maker', predicate: response.body.id_token.payload.webId },
    { tokenKey: 'http://xmlns.com/foaf/0.1/primaryTopic', predicate: response.body.id_token.payload.webId },
    { tokenKey: 'http://xmlns.com/foaf/0.1/given_name', predicate: response.body.id_token.payload.given_name },
    { tokenKey: 'http://xmlns.com/foaf/0.1/family_name', predicate: response.body.id_token.payload.family_name },
  ];

  const webIdProfileHandler = new WebIdProfileHandler(predicates);

  beforeAll(() => fetchMock.enableMocks());

  it('should be correctly instantiated', () => {

    expect(new WebIdProfileHandler(predicates)).toBeTruthy();

  });

  it('should error when no predicates are provided', () => {

    expect(() => new WebIdProfileHandler(undefined)).toThrow('Predicate list is required');

  });

  describe('handle', () => {

    it('should error when no response was provided', async () => {

      await expect(webIdProfileHandler.handle(undefined).toPromise()).rejects.toThrow('A response must be provided');

    });

    it('should generate a body when profile document does not exist', async () => {

      fetchMock.once(webIdContent, { headers: { 'content-type':'text/turtle' }, status: 404 });

      webIdProfileHandler.generateProfileBody = jest.fn().mockReturnValue(webIdContent);

      await webIdProfileHandler.handle(response).toPromise();

      expect(webIdProfileHandler.generateProfileBody).toHaveBeenCalledTimes(1);

      expect(webIdProfileHandler.generateProfileBody)
        .toHaveBeenCalledWith(predicates, response.body.id_token.payload.webId);

      expect(webIdProfileHandler
        .generateProfileBody(predicates, response.body.id_token.payload.webId)).toEqual(webIdContent);

    });

    it('should create a profile when document does not exist', async () => {

      fetchMock.once(webIdContent, { headers: { 'content-type':'text/turtle' }, status: 404 });

      webIdProfileHandler.createWebIdProfile = jest.fn();

      await webIdProfileHandler.handle(response).toPromise();

      expect(webIdProfileHandler.createWebIdProfile).toHaveBeenCalledTimes(1);

      expect(webIdProfileHandler.createWebIdProfile)
        .toHaveBeenCalledWith(response.body.id_token.payload.webId, webIdContent);

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
