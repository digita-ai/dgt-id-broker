/**
 * Consists of all possible algorithms supported for key generation
 */
export type KeyGenerationAlgorithm =
  'ECDH-ES' |
  'ECDH-ES+A128KW' |
  'ECDH-ES+A192KW' |
  'ECDH-ES+A256KW' |
  'EdDSA' |
  'ES256' |
  'ES256K' |
  'ES384' |
  'ES512' |
  'PS256' |
  'PS384' |
  'PS512' |
  'RS256' |
  'RS384' |
  'RS512' |
  'RSA-OAEP-256' |
  'RSA-OAEP-384' |
  'RSA-OAEP-512' |
  'RSA-OAEP' |
  'RSA1_5';
