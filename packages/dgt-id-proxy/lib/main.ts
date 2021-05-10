import * as path from 'path';
import { ComponentsManager, ParameterHandler } from 'componentsjs';
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
    : path.join(__dirname, '../config/presets/solid-compliant-opaque-access-tokens.json');

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
      proxyUri: { type: 'string', alias: 'u' },
      upstreamUri: { type: 'string', alias: 'U' },
      mainModulePath: { type: 'string', alias: 'm' },
      openidConfigurationFilePath: { type: 'string', alias: 'o' },
      jwksFilePath: { type: 'string', alias: 'j' },
    })
    .help();

  if (params.proxyUri) {
    if (!params.proxyUri.startsWith('http://') && !params.proxyUri.startsWith('https://')) {
      params.proxyUri = 'http://' + params.proxyUri;
    }
    try {
      const proxyUrl = new URL(params.proxyUri);
      params.proxyHost = proxyUrl.hostname;
      params.proxyPort = proxyUrl.port !== '' ? proxyUrl.port : undefined;
    } catch (e) {
      throw new Error('proxyUri must be a valid uri');
    }
  }

  if (params.upstreamUri) {
    if (!params.upstreamUri.startsWith('http://') && !params.upstreamUri.startsWith('https://')) {
      params.upstreamUri = 'http://' + params.upstreamUri;
    }
    try {
      const upstreamUrl = new URL(params.upstreamUri);
      params.upstreamHost = upstreamUrl.hostname;
      params.upstreamPort = upstreamUrl.port !== '' ? upstreamUrl.port : undefined;
    } catch (e) {
      throw new Error('upstreamUri must be a valid uri');
    }
  }

  return {
    'urn:dgt-id-proxy:variables:customConfigPath': params.config,
    'urn:dgt-id-proxy:variables:mainModulePath': params.mainModulePath,
    'urn:dgt-id-proxy:variables:proxyUri': params.upstreamHost ? params.upstreamHost : 'http://localhost:3003',
    'urn:dgt-id-proxy:variables:proxyHost': params.proxyHost ? params.proxyHost : 'localhost',
    'urn:dgt-id-proxy:variables:proxyPort': params.proxyPort ? params.proxyPort : '3003',
    'urn:dgt-id-proxy:variables:upstreamUri': params.upstreamHost ? params.upstreamHost : 'http://localhost:3000',
    'urn:dgt-id-proxy:variables:upstreamHost': params.upstreamHost ? params.upstreamHost : 'localhost',
    'urn:dgt-id-proxy:variables:upstreamPort': params.upstreamPort ? params.upstreamPort : '3000',
    'urn:dgt-id-proxy:variables:openidConfigurationFilePath': params.openidConfigurationFilePath ? params.openidConfigurationFilePath : 'assets/openid-configuration.json',
    'urn:dgt-id-proxy:variables:jwksFilePath': params.jwksFilePath ? params.jwksFilePath : 'assets/jwks.json',
  };
};

const vars = createVariables(process.argv);

launch(vars);
