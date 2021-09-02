/**
 * First check if the url provided is actually a valid URL and than return the Response of the fetch
 *
 * @param url the url you want to fetch from
 * @returns the Response object from the fetch request
 */
export const validateAndFetch = async (url: string, options?: Record<string, unknown>): Promise<Response> => {

  if (!url) { throw new Error('Parameter "url" should be set'); }

  try {

    new URL(url);

  } catch(error: unknown) {

    throw new Error('Please provide a valid URL');

  }

  return options ? fetch(url, { ...options }) : fetch(url);

};
