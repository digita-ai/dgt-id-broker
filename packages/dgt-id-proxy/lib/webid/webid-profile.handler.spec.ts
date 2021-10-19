import { WebIdProfileHandler } from './webid-profile.handler';

describe('WebIdProfileHandler', () => {

  const webId = 'http://solid.community.com/23121d3c-84df-44ac-b458-3d63a9a05497dollar/profile/card#me';

  const response = {
    body: {
      access_token: {
        header: {},
        payload: {
          webId,
          'sub': '123456789',
        },
      },
      id_token: {
        header: {},
        payload: {
          webId,
          'sub': '123456789',
          'username': '23121d3c-84df-44ac-b458-3d63a9a05497/|:$^?#{}[]',
        },
      },
    },
    headers: {},
    status: 200,
  };

  const webIdProfileHandler = new WebIdProfileHandler();

  it('should be correctly instantiated', () => {

    expect(new WebIdProfileHandler()).toBeTruthy();

  });

  describe('handle', () => {

    it('should error when no response was provided', async () => {

      await expect(webIdProfileHandler.handle(undefined).toPromise()).rejects.toThrow('A response must be provided');

    });

    fit('should', async () => {

      await webIdProfileHandler.handle(response).toPromise();

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
