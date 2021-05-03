import { HttpHandlerResponse } from '@digita-ai/handlersjs-http';
import { generateKeyPair } from 'jose/util/generate_key_pair';import { SignJWT } from 'jose/jwt/sign';
import { WebIDResponseHandler } from './webid-response.handler';

describe('WebIDResponseHandler', () => {
  let response: HttpHandlerResponse;
  let badResponse: HttpHandlerResponse;

  const webIdPattern = 'http://solid.community.com/:uuid/profile/card#me';
  const webIdWithSub = 'http://solid.community.com/23121d3c-84df-44ac-b458-3d63a9a05497/profile/card#me';
  const webid = 'http://example.com/examplename/profile/card#me';
  const webIDResponseHandler = new WebIDResponseHandler(webIdPattern);

  beforeEach(() => {
    response = {
      body: {
        access_token: {
          header: {},
          payload: {
            webid,
            'sub': '23121d3c-84df-44ac-b458-3d63a9a05497',
          },
        },
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkI0dXNGWnBBeE1ZR3ZaZUpINnpQMEhCRHJrOHhuWE15V05UR1BhUHdPSmMifQ.eyJzdWIiOiIyMzEyMWQzYy04NGRmLTQ0YWMtYjQ1OC0zZDYzYTlhMDU0OTciLCJhdXRoX3RpbWUiOjE2MjAwMzY0MjIsImF0X2hhc2giOiJLdXdYTjRzZFVJRl9tSzNJVVY4SENBIiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdDozMDAyL2phc3BlcnZhbmRlbmJlcmdoZW4vcHJvZmlsZS9jYXJkI21lIiwiZXhwIjoxNjIwMDQwMDg5LCJpYXQiOjE2MjAwMzY0ODksImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJ9.ABTZQ9-RvuUG0StnmePRUGOp5BGuMghcqeUg-4Rlvour6wwCYmq2g7kZ9RUMrbuvMcHZzq5kjwUNiRlhj0s2GjzFxaOeKW9v1ttns4o_puNF2RTTLUF08zO_Ml0bBOLsehPSkYdPRBrWcm8YJAmbfqI_myi2aaKhYNTXBYf8a3ffJGuWUWQ-BzWsy8rwydULBJ46nmSuBdwlJw_peCsum_66BB8E6lORVHgTdI0LCutoNfOwxPkD1B9AyOnLp-tLDip_COhRs41pvVJynOGD0D-X2A_g6C4_VOJJD88OughWY4c1ffmd3R_9A2VytRDEXC6TutrpRhquwzKuyX4Rcg',
      },
      headers: {},
      status: 200,
    } as HttpHandlerResponse;

    badResponse = {
      body: '',
      headers: {},
      status: 400,
    } as HttpHandlerResponse;

  });

  it('should be correctly instantiated', () => {
    expect(webIDResponseHandler).toBeTruthy();
  });

  it('should error when no webIDPattern is provided', () => {
    expect(() => new WebIDResponseHandler(null)).toThrow('A WebID pattern must be provided');
    expect(() => new WebIDResponseHandler(undefined)).toThrow('A WebID pattern must be provided');
  });

  describe('handle', () => {
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

    it('should error when no sub claim was found in the payload', async () => {
      delete response.body.access_token.payload.sub;
      badResponse.body = JSON.stringify({ error: 'bad_request', error_description: 'No sub claim was included' });
      await expect(webIDResponseHandler.handle(response).toPromise()).rejects.toThrow('No sub claim was included in the access token');
    });

    it('should add a webid claim based on the subclaim to the payload', async () => {
      delete response.body.access_token.payload.webid;
      const responseGotten = await webIDResponseHandler.handle(response).toPromise();
      expect(responseGotten.body.access_token.payload.webid).toEqual(webIdWithSub);
    });

    it('should set webid claim from access_token to the same as the webid claim from id_token if one is present', async () => {
      const keyPair = await generateKeyPair('ES256');
      const mockIdToken = await new SignJWT(
        {
          webid,
        },
      )
        .setProtectedHeader({ alg: 'ES256', kid: 'keyid', typ: 'jwt'  })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(keyPair.privateKey);

      response.body.id_token = mockIdToken;
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
