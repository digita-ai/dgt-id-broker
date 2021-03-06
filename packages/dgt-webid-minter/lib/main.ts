
import * as path from 'path';
import { ComponentsManager } from 'componentsjs';
import { NodeHttpServer } from '@digita-ai/handlersjs-http';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export const checkUri = (uri: string): { uri: string; host: string; port: string; scheme: string } => {

  const httpUri = uri.match(/^https?:\/\//g) ? uri : 'http://' + uri ;

  try {

    const url = new URL(httpUri);
    const host = url.hostname;
    const port = url.port !== '' ? url.port : (url.protocol === 'http:' ? '80' : '443');
    const scheme = url.protocol;

    return ({
      uri: httpUri,
      host,
      port,
      scheme,
    });

  } catch (e) {

    throw new Error('Invalid uri parameter');

  }

};

/**
 * Instantiates a server from the passed configuration and starts it.
 *
 * @param {Record<string, any>} variables - a record of values for the variables left open in the configuration.
 */
export const launch = async (variables: Record<string, string>): Promise<void> => {

  const mainModulePathVariable = variables['urn:dgt-webid-minter:variables:mainModulePath'];
  const customConfigPathVariable = variables['urn:dgt-webid-minter:variables:customConfigPath'];

  const mainModulePath = mainModulePathVariable
    ? path.isAbsolute(mainModulePathVariable)
      ? mainModulePathVariable
      : path.join(process.cwd(), mainModulePathVariable)
    : path.join(__dirname, '../');

  const configPath = customConfigPathVariable
    ? path.isAbsolute(customConfigPathVariable)
      ? customConfigPathVariable
      : path.join(process.cwd(), customConfigPathVariable)
    : path.join(__dirname, '../config/config-default.json');

  const manager = await ComponentsManager.build({
    mainModulePath,
    logLevel: 'silly',
  });

  await manager.configRegistry.register(configPath);

  const server: NodeHttpServer = await manager.instantiate('urn:handlersjs-http:default:NodeHttpServer', { variables });

  await server.start();

  // eslint-disable-next-line no-console -- top-level log
  console.log(`WebID minter server started on ${variables['urn:dgt-webid-minter:variables:minterUri']}`);

};

export const createVariables = (args: string[]): Record<string, string> => {

  const { argv: params } = yargs(hideBin(args))
    .usage('node ./dist/main.js [args]')
    .options({
      minterUri: { type: 'string', alias: 'u' },
      config: { type: 'string', alias: 'c' },
      mainModulePath: { type: 'string', alias: 'm' },
    })
    .help();

  const { uri: minterUri, host: minterHost, port: minterPort } = params.minterUri ? checkUri(params.minterUri) : { uri: 'http://localhost:3004', host: 'localhost', port: '3004' };

  const mainModulePath = params.mainModulePath
    ? path.isAbsolute(params.mainModulePath)
      ? params.mainModulePath
      : path.join(process.cwd(), params.mainModulePath)
    : path.join(__dirname, '../');

  const configPath = params.config
    ? path.isAbsolute(params.config)
      ? params.config
      : path.join(process.cwd(), params.config)
    : path.join(__dirname, '../config/config-default.json');

  return {
    'urn:dgt-webid-minter:variables:customConfigPath': configPath,
    'urn:dgt-webid-minter:variables:mainModulePath': mainModulePath,
    'urn:dgt-webid-minter:variables:minterUri': minterUri,
    'urn:dgt-webid-minter:variables:minterHost': minterHost,
    'urn:dgt-webid-minter:variables:minterPort': minterPort,
  };

};
