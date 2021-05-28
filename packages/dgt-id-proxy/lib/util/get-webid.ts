export const getWebID = (webID: string): Promise<Response> => fetch(webID, {
  method: 'GET',
  headers: {
    Accept: 'text/turtle',
  },
});
