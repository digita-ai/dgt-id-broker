import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { getTurtleFileAsQuads } from './data-module';
enableFetchMocks();

describe('dataModule', () => {

  beforeEach(() => {

    fetchMock.resetMocks();

  });

  describe('getTurtleFileAsQuads()', () => {

    it('should return all quads present in the file', async () => {

      const mockedResponse = `
        @prefix : <#>.
        @prefix solid: <http://www.w3.org/ns/solid/terms#>.
        @prefix foaf: <http://xmlns.com/foaf/0.1/>.

        :me
          solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
          solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
          foaf:name "HRlinkIT".
      `;

      fetchMock.mockResponseOnce(mockedResponse, { status: 200 });

      const url = new URL('https://not.a.pod/profile/card#me');
      const result = getTurtleFileAsQuads(url);

      await expect(result).resolves.toHaveLength(3);

    });

    it('should throw an error when something goes wrong', async () => {

      fetchMock.mockRejectedValueOnce(undefined);
      const url = new URL('https://not.a.pod/profile/card#me');
      const result = getTurtleFileAsQuads(url);

      await expect(result).rejects.toThrow('Something went wrong while converting to Quads:');

    });

    it('should throw when the url parameter is undefined', async () => {

      const result = getTurtleFileAsQuads(undefined);
      await expect(result).rejects.toThrow('Parameter "url" should be defined!');

    });

    it('should return an empty list when the file does not contain valid turtle', async () => {

      const mockedResponse = `
        @prefix : <#>.
        @prefix solid: <http://www.w3.org/ns/solid/terms#>.

        :me
          privateTypeIndex </settings/privateTypeIndex.ttl>;
          solid:publicTypeIndex /settings/publicTypeIndex.ttl
          foaf:name "HRlinkIT".
      `;

      fetchMock.mockResponseOnce(mockedResponse, { status: 200 });

      const url = new URL('https://not.a.pod/profile/card#me');
      const result = getTurtleFileAsQuads(url);

      await expect(result).resolves.toHaveLength(0);

    });

  });

});
