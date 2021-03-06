import { generateKeyPair, exportJWK, JWK, KeyLike, SignJWT, base64url } from 'jose';
import { lastValueFrom } from 'rxjs';
import fetchMock from 'jest-fetch-mock';
import { verifyUpstreamJwk } from './verify-upstream-jwk';

describe('verifyUpstreamJwk', () => {

  let privateKey: KeyLike;
  let publicJwk: JWK;
  let validToken: string;
  let configResponse: [string, { status: number }] ;
  let jwkResponse: [string, { status: number }];
  const url = 'http://digita.ai';

  const mockJwt = (kid, privKey) => new SignJWT({ 'mockKey': 'mockValue' })
    .setProtectedHeader({
      alg: 'ES256',
      kid,
    })
    .sign(privKey);

  beforeAll(async () => {

    fetchMock.enableMocks();
    const keyPair = await generateKeyPair('ES256');
    privateKey = keyPair.privateKey;
    publicJwk = await exportJWK(keyPair.publicKey);
    publicJwk.kid = 'mockKeyId';
    publicJwk.alg = 'ES256';
    validToken = await mockJwt(publicJwk.kid, privateKey);
    jwkResponse = [ JSON.stringify({ keys: [ publicJwk ] }), { status: 200 } ];
    configResponse = [ JSON.stringify({ jwks_uri: 'http://pathtojwks.com' }), { status: 200 } ];

  });

  beforeEach(() => {

    publicJwk.kid = 'mockKeyId';

  });

  it('should error when token or upstreamUrl are null or undefined', async () => {

    await expect(() => lastValueFrom(verifyUpstreamJwk(null, url))).rejects.toThrow('token must be defined');
    await expect(() => lastValueFrom(verifyUpstreamJwk(undefined, url))).rejects.toThrow('token must be defined');
    await expect(() => lastValueFrom(verifyUpstreamJwk(validToken, null))).rejects.toThrow('upstreamUrl must be defined');
    await expect(() => lastValueFrom(verifyUpstreamJwk(validToken, undefined))).rejects.toThrow('upstreamUrl must be defined');

  });

  it('should error when upstreamUrl is not a valid url', async () => {

    await expect(() => lastValueFrom(verifyUpstreamJwk(validToken, 'notAValidUrl'))).rejects.toThrow('upstreamUrl is not a valid URL');

  });

  it('should error when token is not a valid JWT', async () => {

    await expect(() => lastValueFrom(verifyUpstreamJwk('notAValidJwtToken', url))).rejects.toThrow('token is not a valid JWT');

  });

  it('should error when token does not contain a key id', async () => {

    const tokenWithoutKid = await mockJwt(undefined, privateKey);
    await expect(() => lastValueFrom(verifyUpstreamJwk(tokenWithoutKid, url))).rejects.toThrow('Given token does not contain a key-id to verify');

  });

  it('should error when the upstream server returns a response with a status code other than 200 to the config request', async () => {

    fetchMock.once('mockBody', { status: 404 });
    await expect(() => lastValueFrom(verifyUpstreamJwk(validToken, url))).rejects.toThrow('There was a problem fetching upstream config');

  });

  it('should error when the upstream server returns a response with a status code other than 200 to the jwk request', async () => {

    fetchMock.mockResponses(configResponse, [ 'mockBody', { status: 404 } ]);
    await expect(() => lastValueFrom(verifyUpstreamJwk(validToken, url))).rejects.toThrow('There was a problem fetching upstream jwks');

  });

  it('should error when a jwk with the key id on the token is not found in the list of jwks from the upstream server', async () => {

    publicJwk.kid = 'differentKeyId';

    fetchMock.mockResponses(
      configResponse,
      [ JSON.stringify({ keys: [ publicJwk ] }), { status: 200 } ],
    );

    await expect(() => lastValueFrom(verifyUpstreamJwk(validToken, url))).rejects.toThrow('No JWK with that ID was found');

  });

  it('should error when alg is not present or "none" in the id token header', async () => {

    // create an unsigned token with no alg in the header
    const tokenNoAlg = base64url.encode(JSON.stringify({ kid: 'mockKeyId' })) + '.' + base64url.encode(JSON.stringify({ 'mockKey': 'mockValue' })) + '.' + 'footer';

    fetchMock.mockResponses(
      configResponse,
      jwkResponse,
    );

    await expect(() => lastValueFrom(verifyUpstreamJwk(tokenNoAlg, url))).rejects.toThrow('Token did not contain an alg, and is therefore invalid');

    // this has to be repeated or the fetch will not be mocked again
    fetchMock.mockResponses(
      configResponse,
      jwkResponse,
    );

    // create an unsigned token with alg set to 'none' in the header
    const tokenAlgNone = base64url.encode(JSON.stringify({ kid: 'mockKeyId', alg: 'none' })) + '.' + base64url.encode(JSON.stringify({ 'mockKey': 'mockValue' })) + '.' + 'footer';

    await expect(() => lastValueFrom(verifyUpstreamJwk(tokenAlgNone, url))).rejects.toThrow('Token did not contain an alg, and is therefore invalid');

  });

  it('should error when a jwt was signed with a privateKey that does not match the given publicKey', async () => {

    const keyPair = await generateKeyPair('ES256');
    const incorrectlySignedToken = await mockJwt(publicJwk.kid, keyPair.privateKey);

    fetchMock.mockResponses(
      configResponse,
      jwkResponse,
    );

    await expect(() => lastValueFrom(verifyUpstreamJwk(incorrectlySignedToken, url))).rejects.toThrow('signature verification failed');

  });

  it('should return the payload and header of the token upon success', async () => {

    fetchMock.mockResponses(
      configResponse,
      jwkResponse,
    );

    await expect(lastValueFrom(verifyUpstreamJwk(validToken, url))).resolves.toEqual({
      protectedHeader: {
        alg: 'ES256',
        kid: 'mockKeyId',
      },
      payload: {
        'mockKey': 'mockValue',
      },
    });

  });

});
