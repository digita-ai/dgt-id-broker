import { JWK } from 'jose';
import { privateToPublicJwk } from './private-to-public-jwk';

const privateJWK: JWK = {
  'crv': 'P-256',
  'x': 'ZXD5luOOClkYI-WieNfw7WGISxIPjH_PWrtvDZRZsf0',
  'y': 'vshKz414TtqkkM7gNXKqawrszn44OTSR_j-JxP-BlWo',
  'd': '07JS0yPt-fDABw_28JdENtlF0PTNMchYmfSXz7pRhVw',
  'kty': 'EC',
  'kid': 'Eqa03FG9Z7AUQx5iRvpwwnkjAdy-PwmUYKLQFIgSY5E',
  'alg': 'ES256',
  'use': 'sig',
};

describe('privateToPublicJwk()', () => {

  it('should return the public fields of a given private JWK', async () => {

    expect('d' in privateToPublicJwk(privateJWK)).toBeFalsy();

  });

});
