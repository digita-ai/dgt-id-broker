import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  testTimeout: 300000,
  moduleFileExtensions: [ 'ts', 'js' ],
  rootDir: 'lib',
  testRegex: '.spec.ts$',
  coverageDirectory: '../coverage',
  'collectCoverageFrom': [ '**/*.{ts,js}' ],
  testEnvironment: 'node',
  verbose: false,
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/../tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
export default config;
