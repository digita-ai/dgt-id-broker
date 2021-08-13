import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { validateAndFetch } from './validate-and-fetch';

enableFetchMocks();

beforeEach(() => {

  fetchMock.resetMocks();

});

describe('validateAndFetch()', () => {

  it('should return the Response object from the fetch request', async () => {

    fetchMock.mockResponseOnce('response', { status: 200 });
    const result = validateAndFetch('http://valid.url/');
    await expect(result).resolves.toBeTruthy();
    const awaitedResult = await result;
    expect(awaitedResult.status).toBe(200);
    expect(await awaitedResult.text()).toBe('response');

  });

  it('should pass on the options to fetch if they were provided', async () => {

    fetchMock.mockResponseOnce('response', { status: 200 });
    const result = validateAndFetch('http://valid.url/', { method: 'POST' });
    await expect(result).resolves.toBeTruthy();
    const awaitedResult = await result;
    expect(awaitedResult.status).toBe(200);
    expect(await awaitedResult.text()).toBe('response');
    // fetchMock does not allow us checking which options were added to the fetch request
    // This test is only useful for coverage

  });

  it('should throw when parameter "url" is undefined', async () => {

    const result = validateAndFetch(undefined);
    await expect(result).rejects.toThrow('Parameter "url" should be set');

  });

  it('should throw when parameter "url" is not a valid URL', async () => {

    const result = validateAndFetch('notValid');
    await expect(result).rejects.toThrow('Please provide a valid URL');

  });

});
