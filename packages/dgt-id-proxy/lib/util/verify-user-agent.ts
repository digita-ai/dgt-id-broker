export const verifyUserAgent = (userAgent: string): boolean => {

  let safariAgent = userAgent.indexOf('Safari') > -1;
  const chromeAgent = userAgent.indexOf('Chrome') > -1;

  // chrome user agent also matches safari so make sure to rule that out
  if ((chromeAgent) && (safariAgent)) safariAgent = false;

  return safariAgent;

};
