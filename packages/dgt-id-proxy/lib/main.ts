import * as path from 'path';
import { ComponentsManager } from 'componentsjs';
import { NodeHttpServer } from '@digita-ai/handlersjs-http';

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
    : path.join(__dirname, '../config/default.json');

  const manager = await ComponentsManager.build({
    mainModulePath,
    logLevel: 'silly',
  });

  await manager.configRegistry.register(configPath);

  const server: NodeHttpServer = await manager.instantiate('urn:handlersjs-http:default:NodeHttpServer', { variables });
  server.start();
};

launch({});
