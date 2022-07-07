import path from 'path';
import { createVariables } from '../lib/main';

export const mainModulePath = path.join(__dirname, '../');
export const configPath = path.join(mainModulePath, 'test/config/full-integration-config.json');
export const variables = createVariables([ 'npm run start',
  '--',
  '-u',
  'http://localhost:3003/',
  '-U',
  'http://localhost:3000/',
  '-o',
  `${path.join(__dirname, '../assets/openid-configuration.json')}`,
  '-j',
  `${path.join(__dirname, '../assets/jwks.json')}`,
  '-c',
  'test/config/full-integration-config.json',
  '-m',
  mainModulePath ]);
