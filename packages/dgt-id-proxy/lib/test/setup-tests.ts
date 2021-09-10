import path from 'path';
import { createVariables } from '../main';

export const mainModulePath = path.join(__dirname, '../..');
export const configPath = path.join(mainModulePath, 'lib/test/config/full-integration-config.json');
export const variables = createVariables([ 'npm run start', '--', '-c', 'lib/test/config/full-integration-config.json', '-m', mainModulePath ]);
