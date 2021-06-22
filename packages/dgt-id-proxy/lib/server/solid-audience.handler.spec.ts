import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { SolidAudienceHandler } from './solid-audience.handler';

describe('SolidAudienceHandler', () => {

  let handler: SolidAudienceHandler;
  let response: HttpHandlerResponse;

  beforeEach(() => {

    handler = new SolidAudienceHandler();

    response = {
      body: {
        access_token: {
          header: {},
          payload: {},
        },
        expires_in: 7200,
        scope: '',
        token_type: 'Bearer',
      },
      headers: {},
      status: 200,
    };

  });

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  describe('handle', () => {

    it('should error when no response is provided', async () => {

      await expect(() => handler.handle(undefined).toPromise()).rejects.toThrow('response cannot be null or undefined');
      await expect(() => handler.handle(null).toPromise()).rejects.toThrow('response cannot be null or undefined');

    });

    it('should return the response unedited if the response has a status other than 200', async () => {

      response.status = 400;

      await expect(handler.handle(response).toPromise()).resolves.toEqual(response);

    });

    it('should error when response body does not have an access token or is not in JSON format', async () => {

      response.body = 'mockbody';
      await expect(() => handler.handle(response).toPromise()).rejects.toThrow('Response body must contain an access token with a payload in JSON format');

      response.body = {
        access_token: 'mockToken',
      };

      await expect(() => handler.handle(response).toPromise()).rejects.toThrow('Response body must contain an access token with a payload in JSON format');

    });

    it('should return a token with an aud array containing solid', async () => {

      // single aud claim
      response.body.access_token.payload.aud = 'client';
      const resp1 = await handler.handle(response).toPromise();
      expect(resp1.status).toEqual(200);
      expect(resp1.body.access_token.payload).toBeDefined();
      expect(resp1.body.access_token.payload.aud).toEqual([ 'client', 'solid' ]);

      // aud claim as array
      response.body.access_token.payload.aud = [ 'client', 'audience' ];
      const resp2 = await handler.handle(response).toPromise();
      expect(resp2.status).toEqual(200);
      expect(resp2.body.access_token.payload).toBeDefined();
      expect(resp2.body.access_token.payload.aud).toEqual([ 'client', 'audience', 'solid' ]);

    });

    it('should return the token as is if audience is already "solid" or an array containing "solid"', async () => {

      // aud claim is solid
      response.body.access_token.payload.aud = 'solid';
      const resp1 = await handler.handle(response).toPromise();
      expect(resp1.status).toEqual(200);
      expect(resp1.body.access_token.payload).toBeDefined();
      expect(resp1.body.access_token.payload.aud).toEqual('solid');

      // aud claim is an array containing solid
      response.body.access_token.payload.aud = [ 'client', 'solid' ];
      const resp2 = await handler.handle(response).toPromise();
      expect(resp2.status).toEqual(200);
      expect(resp2.body.access_token.payload).toBeDefined();
      expect(resp2.body.access_token.payload.aud).toEqual([ 'client', 'solid' ]);

    });

  });

  describe('canHandle', () => {

    it('should return false if no response was provided', async () => {

      await expect(handler.canHandle(undefined).toPromise()).resolves.toEqual(false);
      await expect(handler.canHandle(null).toPromise()).resolves.toEqual(false);

    });

    it('should return false if a response was provided without an access_token or payload', async () => {

      response.body = 'mockbody';
      await expect(handler.canHandle(response).toPromise()).resolves.toEqual(false);

      response.body = {
        access_token: 'mockToken',
      };

      await expect(handler.canHandle(response).toPromise()).resolves.toEqual(false);

    });

    it('should return true if a correct response was provided', async () => {

      await expect(handler.canHandle(response).toPromise()).resolves.toEqual(true);

    });

  });

});
