import path from 'path';
import { createVariables } from '../lib/main';

export const mainModulePath = path.join(__dirname, '../');
export const configPath = path.join(mainModulePath, 'test/config/full-integration-config.json');
export const variables = createVariables([ 'npm run start', '--', '-c', 'test/config/full-integration-config.json', '-m', mainModulePath ]);
