import { SingleClaimWebIdFactory } from './single-claim-webid-factory';

describe('SingleClaimWebIdFactory', () => {

  const webIdPattern = 'http://localhost:3002/:customclaim/profile/card#me';

  const id_token_payload = {
    sub: '123456789',
    username: '23121d3c-84df-44ac-b458-3d63a9a05497/|:$^?#{}[]',
  };

  const singleClaimWebIdFactory: SingleClaimWebIdFactory = new SingleClaimWebIdFactory(webIdPattern, 'username');

  it('should be correctly instantiated', () => {

    expect(new SingleClaimWebIdFactory(webIdPattern)).toBeTruthy();

  });

  it('should error when no webIdPattern was provided', () => {

    expect(() => new SingleClaimWebIdFactory(undefined)).toThrow('A WebID pattern must be provided');
    expect(() => new SingleClaimWebIdFactory(null)).toThrow('A WebID pattern must be provided');

  });

  describe('handle', () => {

    it('should set the claim in the webid as username if claim provided was username', async () => {

      const minted_webid = await singleClaimWebIdFactory.handle(id_token_payload).toPromise();

      expect(minted_webid).toEqual('http://localhost:3002/23121d3c-84df-44ac-b458-3d63a9a05497dollar/profile/card#me');

    });

    it('should set the claim as sub if no claim was provided', async () => {

      const noClaimWebIdFactory = new SingleClaimWebIdFactory(webIdPattern);
      const minted_webid = await noClaimWebIdFactory.handle(id_token_payload).toPromise();

      expect(minted_webid).toEqual('http://localhost:3002/123456789/profile/card#me');

    });

    it('should error when no payload was provided', async () => {

      await expect(() => singleClaimWebIdFactory.handle(null).toPromise()).rejects.toThrow('No payload was provided');
      await expect(() => singleClaimWebIdFactory.handle(undefined).toPromise()).rejects.toThrow('No payload was provided');

    });

    it('should error when custom claim is missing in the payload was provided', async () => {

      await expect(() => singleClaimWebIdFactory.handle({
        'webid': 'http://example.com/examplename/profile/card#me',
      },).toPromise()).rejects.toThrow('The custom claim provided was not found in the id token payload');

    });

  });

  describe('canHandle', () => {

    it('should return false if no payload was provided', async () => {

      await expect(singleClaimWebIdFactory.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(singleClaimWebIdFactory.canHandle(undefined).toPromise()).resolves.toEqual(false);

    });

    it('should return true if payload was provided', async () => {

      await expect(singleClaimWebIdFactory.canHandle({ 'sub': '123' }).toPromise()).resolves.toEqual(true);

    });

  });

});
