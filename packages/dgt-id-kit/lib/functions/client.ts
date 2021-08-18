
export const loginWithIssuer = async (
  issuer: string,
  clientId: string,
  scope: string,
  responseType: string,
): Promise<void> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!scope) { throw new Error('Parameter "scope" should be set'); }

  if (!responseType) { throw new Error('Parameter "responseType" should be set'); }

};

export const loginWithWebId = async (
  webId: string,
  clientId: string,
  scope: string,
  responseType: string,
): Promise<void> => {

  if (!webId) { throw new Error('Parameter "webId" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!scope) { throw new Error('Parameter "scope" should be set'); }

  if (!responseType) { throw new Error('Parameter "responseType" should be set'); }

};

export const logout = async (): Promise<void> => {

};

export const handleIncommingRedirect = async (
  issuer: string,
  clientId: string,
  redirectUri: string,
  clientSecret?: string,
): Promise<void> => {

  if (!issuer) { throw new Error('Parameter "issuer" should be set'); }

  if (!clientId) { throw new Error('Parameter "clientId" should be set'); }

  if (!redirectUri) { throw new Error('Parameter "redirectUri" should be set'); }

};
