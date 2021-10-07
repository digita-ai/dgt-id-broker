import { SingleClaimWebIDFactory } from './single-claim-webid-factory';

describe('SingleClaimWebIDFactory', () => {

  const webIdPattern = 'http://localhost:3002/:customclaim/profile/card#me';

  const singleClaimWebIDFactory: SingleClaimWebIDFactory = new SingleClaimWebIDFactory(webIdPattern);

  it('should be correctly instantiated', () => {

    expect(new SingleClaimWebIDFactory(webIdPattern)).toBeTruthy();

  });

  it('should error when no webIdPattern was provided', () => {

    expect(() => new SingleClaimWebIDFactory(undefined)).toThrow('A WebID pattern must be provided');
    expect(() => new SingleClaimWebIDFactory(null)).toThrow('A WebID pattern must be provided');

  });

  describe('handle', () => {

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
