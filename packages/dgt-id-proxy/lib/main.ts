import * as path from 'path';
import { ComponentsManager } from 'componentsjs';
import { NodeHttpServer } from './server/node-http-server';

/**
 * start tells componentsjs to build our application and setup all the dependencies.
 * It then instantiates our server and starts it.
 *
 * @param {Record<string, any>} variables
 */
export const start: (variables: Record<string, any>) => Promise<void> = async (variables: Record<string, any>) => {
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

  const launch: NodeHttpServer = await manager.instantiate('urn:dgt-id-proxy:default:NodeHttpServer', { variables });
  launch.start();
};
