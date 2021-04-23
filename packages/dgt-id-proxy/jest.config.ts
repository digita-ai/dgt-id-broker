import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  testTimeout: 300000,
  moduleFileExtensions: [ 'ts', 'js' ],
  rootDir: 'lib',
  testRegex: '.spec.ts$',
  coverageDirectory: '../coverage',
  'collectCoverageFrom': [ '**/*.{ts,js}' ],
  testEnvironment: 'node',
  verbose: true,
  preset: 'ts-jest',
  moduleNameMapper: {
    '^jose/(.*)$': '<rootDir>/../node_modules/jose/dist/node/cjs/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/../tsconfig.spec.json',
    },
  },
};
export default config;
