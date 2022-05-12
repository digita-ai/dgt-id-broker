import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { of, lastValueFrom } from 'rxjs';
import { WebIdFactory } from '../public-api';
import { WebIdResponseHandler } from './webid-response.handler';

describe('WebIdResponseHandler', () => {

  let response: HttpHandlerResponse;
  const webIdWithCustomClaim = 'http://solid.community.com/23121d3c-84df-44ac-b458-3d63a9a05497dollar/profile/card#me';
  const webid = 'http://example.com/examplename/profile/card#me';

  const singleClaimWebIdFactory: WebIdFactory = {
    handle: jest.fn().mockReturnValue(of(webIdWithCustomClaim)),
  };

  const webIdResponseHandler = new WebIdResponseHandler(singleClaimWebIdFactory);
  const webIdResponseHandlerWithAccessTokenOnlyCustom = new WebIdResponseHandler(singleClaimWebIdFactory, 'access_token');

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

    expect(webIdResponseHandler).toBeTruthy();

  });

  it('should error when no webIDPattern is provided', () => {

    expect(() => new WebIdResponseHandler(null)).toThrow('A webIdFactory must be provided');
    expect(() => new WebIdResponseHandler(undefined)).toThrow('A webIdFactory must be provided');

  });

  it('should error if tokenType is not access_token or id_token', () => {

    expect(() => new WebIdResponseHandler(singleClaimWebIdFactory, 'invalid_token_type')).toThrow('The tokenType must be either id_token or access_token');

  });

  describe('handle', () => {

    it('should call the factory with the given id token payload', async() => {

      response.body.id_token.payload.webid = undefined;

      await lastValueFrom(webIdResponseHandler.handle(response));

      expect(singleClaimWebIdFactory.handle).toHaveBeenCalledTimes(1);
      expect(singleClaimWebIdFactory.handle).toHaveBeenCalledWith(response.body.id_token.payload);

    });

    it('should error when no response was provided', async () => {

      await expect(() => lastValueFrom(webIdResponseHandler.handle(null))).rejects.toThrow('A response must be provided');
      await expect(() => lastValueFrom(webIdResponseHandler.handle(undefined))).rejects.toThrow('A response must be provided');

    });

    it('should error when response has no body', async () => {

      delete response.body;
      await expect(() => lastValueFrom(webIdResponseHandler.handle(response))).rejects.toThrow('The response did not contain a body');

    });

    it('should pass the upstream error in an error response when needed and set status to 400', async () => {

      await expect(lastValueFrom(webIdResponseHandler.handle({ ...response, body: JSON.stringify({ error: 'invalid_request' }), headers: { 'upstream': 'errorHeader' }, status: 401 })))
        .resolves.toEqual({ body: '{"error":"invalid_request"}', headers: { 'upstream': 'errorHeader' }, status: 400 });

    });

    it('should error when response.body has no access_token', async () => {

      delete response.body.access_token;
      await expect(() => lastValueFrom(webIdResponseHandler.handle(response))).rejects.toThrow('The response body did not contain an access_token');

    });

    it('should error when response.body.access_token has no payload', async () => {

      delete response.body.access_token.payload;
      await expect(() => lastValueFrom(webIdResponseHandler.handle(response))).rejects.toThrow('The access_token did not contain a payload');

    });

    it('should error when response.body has no id_token', async () => {

      delete response.body.id_token;
      await expect(() => lastValueFrom(webIdResponseHandler.handle(response))).rejects.toThrow('The response body did not contain an id_token');

    });

    it('should add a webid claim based on the uri encoded custom claim, to the payload of the access token if tokenType is access_token', async () => {

      delete response.body.access_token.payload.webid;
      delete response.body.id_token.payload.webid;
      const responseGotten = await lastValueFrom(webIdResponseHandlerWithAccessTokenOnlyCustom.handle(response));
      expect(responseGotten.body.access_token.payload.webid).toEqual(webIdWithCustomClaim);

    });

    it('should set webid claim from access_token to the same as the webid claim from id_token if one is present', async () => {

      delete response.body.access_token.payload.webid;
      const responseGotten = await lastValueFrom(webIdResponseHandler.handle(response));
      expect(responseGotten.body.access_token.payload.webid).toEqual(webid);

    });

    it('should return the response if the webID claim is present', async () => {

      await expect(lastValueFrom(webIdResponseHandler.handle(response))).resolves.toEqual(response);

    });

  });

  describe('canHandle', () => {

    it('should return true if response was provided', async () => {

      await expect(lastValueFrom(webIdResponseHandler.canHandle(response))).resolves.toEqual(true);

    });

    it('should return false if no response was provided', async () => {

      await expect(lastValueFrom(webIdResponseHandler.canHandle(null))).resolves.toEqual(false);
      await expect(lastValueFrom(webIdResponseHandler.canHandle(undefined))).resolves.toEqual(false);

    });

  });

});
