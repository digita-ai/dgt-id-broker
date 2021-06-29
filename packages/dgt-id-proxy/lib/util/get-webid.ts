/**
 * Performs a get request to retrieve the webid turtle file
 *
 * @param { string } webID
 */
export const getWebID = (webID: string): Promise<Response> => fetch(webID, {
  method: 'GET',
  headers: {
    Accept: 'text/turtle, application/json',
  },
});
