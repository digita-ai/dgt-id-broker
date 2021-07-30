import { Parser } from 'n3';

const parser = new Parser();

export const requestUrl = 'http://url.com';
export const issuer1 = { url: new URL('http://mock-issuer.com/') };
export const issuer2 = { url: new URL('http://mocked-issuer.com/') };

const prefixes = `
  @prefix : <#>.
  @prefix solid: <http://www.w3.org/ns/solid/terms#>.
  @prefix foaf: <http://xmlns.com/foaf/0.1/>.
  @prefix pro: <./>.
`;

const profileTurtle = `
  pro:card a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.
`;

export const plainProfile = `
  ${prefixes}
  ${profileTurtle}
  :me
    foaf:name "name".
`;

export const plainProfileQuads = parser.parse(plainProfile);

export const issuersTurtle = `
  solid:oidcIssuer <${issuer1.url.toString()}>;
  solid:oidcIssuer <${issuer2.url.toString()}>;
`;

export const typeindexesTurtle = `
  solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
  solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
`;

export const profileWithIssuers = `
  ${prefixes}
  ${profileTurtle}
  :me
    ${typeindexesTurtle}
    ${issuersTurtle}
    foaf:name "name".
`;

export const profileWithIssuersQuads = parser.parse(profileWithIssuers);

export const profileWithNoIssuers = `
  ${prefixes}
  ${profileTurtle}
  :me
    ${typeindexesTurtle}
    foaf:name "name".
`;

export const profileWithNoIssuersQuads = parser.parse(profileWithNoIssuers);

export const profileInvalid = `
  ${prefixes}
  :me
    ${typeindexesTurtle}
    foaf:name "name".
`;
