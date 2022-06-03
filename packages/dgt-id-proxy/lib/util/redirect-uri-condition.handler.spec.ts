import { lastValueFrom, of } from 'rxjs';
import { RedirectUriConditionHandler } from './redirect-uri-condition.handler';

describe('RedirectUriConditionHandler', () => {

  const redirectUri = 'http://localhost:3003/redirect';

  const redirectUriHandler = new RedirectUriConditionHandler(redirectUri);

  const response = {
    body: {},
    headers: undefined,
    status: 200,
  };

  it('should be correctly instantiated', () => {

    expect(redirectUriHandler).toBeTruthy();

  });

  describe('handle', () => {

    it('should error when no response is provided', async () => {

      await expect(() => lastValueFrom(redirectUriHandler.handle(undefined))).rejects.toThrow('Response cannot be null or undefined');
      await expect(() => lastValueFrom(redirectUriHandler.handle(null))).rejects.toThrow('Response cannot be null or undefined');

    });

    it('should error when no response headers were specified', () => {

      expect(() => lastValueFrom(redirectUriHandler.handle({ ...response, headers: undefined }))).rejects.toThrow('Response did not contain any headers');

    });

    it('should return true if location headers is present and matches the one provided to the handler', () => {

      const responseWithLocationHeader = {
        ...response,
        headers: {
          location: redirectUri,
        },
      };

      expect(lastValueFrom(redirectUriHandler.handle(responseWithLocationHeader))).resolves.toEqual(true);

    });

  });

  describe('canHandle', () => {

    it('should return true', async () => {

      await expect(lastValueFrom(redirectUriHandler.canHandle(response))).resolves.toBe(true);

    });

  });

});
