
export const loginWithIssuer = async (
  issuer: string,
  clientId: string,
  scope: string,
  responseType: string,
): Promise<void> => {

};

export const loginWithWebId = async (
  webId: string,
  clientId: string,
  scope: string,
  responseType: string,
): Promise<void> => {

};

export const logout = async (): Promise<void> => {

};

export const handleIncommingRedirect = async (
  issuer: string,
  clientId: string,
  redirectUri: string,
  clientSecret?: string,
): Promise<void> => {

};
