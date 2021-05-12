export const  getPod = async (webID: string): Promise<Response> => {

  const response = await fetch(webID, {
    method: 'GET',
    headers: {
      Accept: 'text/turtle',
    },
  });

  return response;

};
