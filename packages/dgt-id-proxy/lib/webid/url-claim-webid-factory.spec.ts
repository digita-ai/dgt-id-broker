import { lastValueFrom  } from 'rxjs';
import { UrlClaimWebIdFactory } from './url-claim-webid-factory';

describe('UrlClaimWebIdFactory', () => {

  const id_token_payload = {
    custom_claim_webid: 'https://example.com/webid',
  };

  const singleClaimWebIdFactory: UrlClaimWebIdFactory = new UrlClaimWebIdFactory('custom_claim_webid');

  it('should be correctly instantiated', () => {

    expect(new UrlClaimWebIdFactory('custom_claim_webid')).toBeTruthy();

  });

  it('should error when no webIdPattern was provided', () => {

    expect(() => new UrlClaimWebIdFactory(undefined)).toThrow('A claim must be provided');
    expect(() => new UrlClaimWebIdFactory(null)).toThrow('A claim must be provided');

  });

  describe('handle', () => {

    it('should return the value of the claim', async () => {

      const minted_webid = await lastValueFrom(singleClaimWebIdFactory.handle(id_token_payload));

      expect(minted_webid).toEqual('https://example.com/webid');

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
