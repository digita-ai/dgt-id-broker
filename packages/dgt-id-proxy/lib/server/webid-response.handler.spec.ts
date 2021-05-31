import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { WebIDResponseHandler } from './webid-response.handler';

describe('WebIDResponseHandler', () => {

  let response: HttpHandlerResponse;

  const webIdPattern = 'http://solid.community.com/:uuid/profile/card#me';
  const webIdWithCustomClaim = 'http://solid.community.com/23121d3c-84df-44ac-b458-3d63a9a05497dollar/profile/card#me';
  const webIdWithSubClaim = 'http://solid.community.com/123456789/profile/card#me';
  const webid = 'http://example.com/examplename/profile/card#me';
  const claim = 'username';
  const webIDResponseHandler = new WebIDResponseHandler(webIdPattern, claim);

  beforeEach(() => {

    response = {
      body: {
        access_token: {
          header: {},
          payload: {
            webid,
            'sub': '123456789',
          },
        },
        id_token: {
          header: {},
          payload: {
            webid,
            'sub': '123456789',
            'username': '23121d3c-84df-44ac-b458-3d63a9a05497/|:$^?#{}[]',
          },
        },
      },
      headers: {},
      status: 200,
    };

  });

  it('should be correctly instantiated', () => {

    expect(webIDResponseHandler).toBeTruthy();

  });

  it('should error when no webIDPattern is provided', () => {

    expect(() => new WebIDResponseHandler(null, claim)).toThrow('A WebID pattern must be provided');
    expect(() => new WebIDResponseHandler(undefined, claim)).toThrow('A WebID pattern must be provided');

  });

  describe('handle', () => {

    it('should set the claim as sub if no clain was provided', async () => {

      delete response.body.id_token.payload.webid;
      const handler = new WebIDResponseHandler(webIdPattern);
      const responseGotten = await handler.handle(response).toPromise();
      expect(responseGotten.body.access_token.payload.webid).toEqual(webIdWithSubClaim);

    });

    it('should error when no response was provided', async () => {

      await expect(() => webIDResponseHandler.handle(null).toPromise()).rejects.toThrow('A response must be provided');
      await expect(() => webIDResponseHandler.handle(undefined).toPromise()).rejects.toThrow('A response must be provided');

    });

    it('should error when response has no body', async () => {

      delete response.body;
      await expect(() => webIDResponseHandler.handle(response).toPromise()).rejects.toThrow('The response did not contain a body');

    });

    it('should error when response.body has no access_token', async () => {

      delete response.body.access_token;
      await expect(() => webIDResponseHandler.handle(response).toPromise()).rejects.toThrow('The response body did not contain an access_token');

    });

    it('should error when response.body.access_token has no payload', async () => {

      delete response.body.access_token.payload;
      await expect(() => webIDResponseHandler.handle(response).toPromise()).rejects.toThrow('The access_token did not contain a payload');

    });

    it('should error when response.body has no id_token', async () => {

      delete response.body.id_token;
      await expect(() => webIDResponseHandler.handle(response).toPromise()).rejects.toThrow('The response body did not contain an id_token');

    });

    it('should error when no custom claim was found in the id token payload', async () => {

      delete response.body.id_token.payload[claim];
      await expect(webIDResponseHandler.handle(response).toPromise()).rejects.toThrow('The custom claim provided was not found in the id token payload');

    });

    it('should add a webid claim based on the uri encoded custom claim, to the payload', async () => {

      delete response.body.access_token.payload.webid;
      delete response.body.id_token.payload.webid;
      const responseGotten = await webIDResponseHandler.handle(response).toPromise();
      expect(responseGotten.body.access_token.payload.webid).toEqual(webIdWithCustomClaim);

    });

    it('should set webid claim from access_token to the same as the webid claim from id_token if one is present', async () => {

      delete response.body.access_token.payload.webid;
      const responseGotten = await webIDResponseHandler.handle(response).toPromise();
      expect(responseGotten.body.access_token.payload.webid).toEqual(webid);

    });

    it('should return the response if the webID claim is present', async () => {

      await expect(webIDResponseHandler.handle(response).toPromise()).resolves.toEqual(response);

    });

  });

  describe('canHandle', () => {

    it('should return true if response was provided', async () => {

      await expect(webIDResponseHandler.canHandle(response).toPromise()).resolves.toEqual(true);

    });

    it('should return false if no response was provided', async () => {

      await expect(webIDResponseHandler.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(webIDResponseHandler.canHandle(undefined).toPromise()).resolves.toEqual(false);

    });

  });

});
