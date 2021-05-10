import * as path from 'path';
import { ComponentsManager } from 'componentsjs';
import { NodeHttpServer } from '@digita-ai/handlersjs-http';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

/**
 * Instantiates a server from the passed configuration and starts it.
 *
 * @param {Record<string, any>} variables - a record of values for the variables left open in the configuration.
 */
export const launch: (variables: Record<string, any>) => Promise<void> = async (variables: Record<string, any>) => {
  const mainModulePath = variables['urn:dgt-id-proxy:variables:mainModulePath']
    ? path.join(process.cwd(), variables['urn:dgt-id-proxy:variables:mainModulePath'])
    : path.join(__dirname, '../');

  const configPath = variables['urn:dgt-id-proxy:variables:customConfigPath']
    ? path.join(process.cwd(), variables['urn:dgt-id-proxy:variables:customConfigPath'])
    : path.join(__dirname, '../config/presets/solid-compliant-jwt-access-tokens.json');

  const manager = await ComponentsManager.build({
    mainModulePath,
    logLevel: 'silly',
  });

  await manager.configRegistry.register(configPath);

  const server: NodeHttpServer = await manager.instantiate('urn:handlersjs-http:default:NodeHttpServer', { variables });
  server.start();
};

export const createVariables: (args: string[]) => Record<string, any> = (args: string[]): Record<string, any> => {
  const { argv: params } = yargs(hideBin(args))
    .usage('node ./dist/main.js [args]')
    .options({
      config: { type: 'string', alias: 'c' },
      baseUri: { type: 'string', alias: 'b' },
      cacheUri: { type: 'string', alias: 'cu' },
      publicUri: { type: 'string', alias: 'pu' },
      port: { type: 'number', alias: 'p' },
      mainModulePath: { type: 'string', alias: 'm' },
    })
    .help();

  return {
    'urn:dgt-platform-api:variables:customConfigPath': params.config,
    'urn:dgt-platform-api:variables:mainModulePath': params.mainModulePath,
    'urn:dgt-platform-api:variables:baseUri': params.baseUri ? params.baseUri : 'http://localhost:3000/',
    'urn:dgt-platform-api:variables:cacheUri': params.cacheUri ? params.cacheUri : 'http://localhost:3001/sparql/',
    'urn:dgt-platform-api:variables:publicUri': params.publicUri ? params.publicUri : 'http://localhost:4203/',
    'urn:dgt-platform-api:variables:port': params.port ? params.port : '3000',
  };
};

launch({});
