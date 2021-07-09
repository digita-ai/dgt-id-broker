import path from 'path';
import { createVariables } from '../main';

export const mainModulePath = path.join(__dirname, '../..');
export const configPath = path.join(mainModulePath, './lib/test/config/full-integration-config.json');
export const variables = createVariables([ 'npm run start', '--', '-c', 'config/presets/solid-compliant-opaque-access-tokens.json', '-o', 'assets/openid-configuration.json', '-j', 'assets/jwks.json' ]);

// eslint-disable-next-line @typescript-eslint/no-empty-function
export default async () => { };
