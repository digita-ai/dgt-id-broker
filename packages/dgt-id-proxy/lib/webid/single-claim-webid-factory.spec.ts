import { SingleClaimWebIDFactory } from './single-claim-webid-factory';

describe('SingleClaimWebIDFactory', () => {

  const webIdPattern = 'http://localhost:3002/:customclaim/profile/card#me';

  const id_token_payload = {
    sub: '123456789',
    username: '23121d3c-84df-44ac-b458-3d63a9a05497/|:$^?#{}[]',
  };

  const singleClaimWebIDFactory: SingleClaimWebIDFactory = new SingleClaimWebIDFactory(webIdPattern, 'username');

  it('should be correctly instantiated', () => {

    expect(new SingleClaimWebIDFactory(webIdPattern)).toBeTruthy();

  });

  it('should error when no webIdPattern was provided', () => {

    expect(() => new SingleClaimWebIDFactory(undefined)).toThrow('A WebID pattern must be provided');
    expect(() => new SingleClaimWebIDFactory(null)).toThrow('A WebID pattern must be provided');

  });

  describe('handle', () => {

    it('should set the claim in the webid as username if claim provided was username', async () => {

      const minted_webid = await singleClaimWebIDFactory.handle(id_token_payload).toPromise();

      expect(minted_webid).toEqual('http://localhost:3002/23121d3c-84df-44ac-b458-3d63a9a05497dollar/profile/card#me');

    });

    it('should set the claim as sub if no claim was provided', async () => {

      const noClaimWebIDFactory = new SingleClaimWebIDFactory(webIdPattern);
      const minted_webid = await noClaimWebIDFactory.handle(id_token_payload).toPromise();

      expect(minted_webid).toEqual('http://localhost:3002/123456789/profile/card#me');

    });

    it('should error when no payload was provided', async () => {

      await expect(() => singleClaimWebIDFactory.handle(null).toPromise()).rejects.toThrow('No payload was provided');
      await expect(() => singleClaimWebIDFactory.handle(undefined).toPromise()).rejects.toThrow('No payload was provided');

    });

    it('should error when custom claim is missing in the payload was provided', async () => {

      await expect(() => singleClaimWebIDFactory.handle({
        'webid': 'http://example.com/examplename/profile/card#me',
      },).toPromise()).rejects.toThrow('The custom claim provided was not found in the id token payload');

    });

  });

  describe('canHandle', () => {

    it('should return false if no payload was provided', async () => {

      await expect(singleClaimWebIDFactory.canHandle(null).toPromise()).resolves.toEqual(false);
      await expect(singleClaimWebIDFactory.canHandle(undefined).toPromise()).resolves.toEqual(false);

    });

    it('should return true if payload was provided', async () => {

      await expect(singleClaimWebIDFactory.canHandle({ 'sub': '123' }).toPromise()).resolves.toEqual(true);

    });

  });

});
