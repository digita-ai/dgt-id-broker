import { lastValueFrom  } from 'rxjs';
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

    it.each`
      pattern | expected
      ${'http://localhost:3002/:sub/profile/card#me'} | ${'http://localhost:3002/123456789/profile/card#me'}
      ${'http://192.168.0.1:3002/:sub/profile/card#me'} | ${'http://192.168.0.1:3002/123456789/profile/card#me'}
      ${'http://192.168.0.1/:sub/profile/card#me'} | ${'http://192.168.0.1/123456789/profile/card#me'}
      ${'http://www.example.com/:sub/profile/card#me'} | ${'http://www.example.com/123456789/profile/card#me'}
      ${'http://:sub.example.com/profile/card#me'} | ${'http://123456789.example.com/profile/card#me'}

    `('should set webid to $expected if pattern is $pattern', async ({ pattern, expected }) => {

      const factory = new SingleClaimWebIdFactory(pattern);

      const minted_webid = await lastValueFrom(factory.handle(id_token_payload));

      expect(minted_webid).toEqual(expected);

    });

    it('should set the claim as sub if no claim was provided', async () => {

      const noClaimWebIdFactory = new SingleClaimWebIdFactory(webIdPattern);
      const minted_webid = await lastValueFrom(noClaimWebIdFactory.handle(id_token_payload));

      expect(minted_webid).toEqual('http://localhost:3002/123456789/profile/card#me');

    });

    it('should error when no payload was provided', async () => {

      await expect(() => lastValueFrom(singleClaimWebIdFactory.handle(null))).rejects.toThrow('No payload was provided');
      await expect(() => lastValueFrom(singleClaimWebIdFactory.handle(undefined))).rejects.toThrow('No payload was provided');

    });

    it('should error when custom claim is missing in the payload was provided', async () => {

      await expect(() => lastValueFrom(singleClaimWebIdFactory.handle({
        'webid': 'http://example.com/examplename/profile/card#me',
      },))).rejects.toThrow('The custom claim provided was not found in the id token payload');

    });

  });

  describe('canHandle', () => {

    it('should return false if no payload was provided', async () => {

      await expect(lastValueFrom(singleClaimWebIdFactory.canHandle(null))).resolves.toEqual(false);
      await expect(lastValueFrom(singleClaimWebIdFactory.canHandle(undefined))).resolves.toEqual(false);

    });

    it('should return true if payload was provided', async () => {

      await expect(lastValueFrom(singleClaimWebIdFactory.canHandle({ 'sub': '123' }))).resolves.toEqual(true);

    });

  });

});
