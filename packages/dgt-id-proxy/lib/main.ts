import * as path from 'path';
import { readFileSync } from 'fs';
import { ComponentsManager } from 'componentsjs';
import { NodeHttpServer } from '@digita-ai/handlersjs-http';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const checkUri = (uri: string) => {

  const httpUri = uri.match(/^https?:\/\//g) ? uri : 'http://' + uri ;

  try {

    const url = new URL(httpUri);
    const host = url.hostname;
    const port = url.port !== '' ? url.port : undefined;
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

const checkFile = (filePath: string): void => {

  try {

    const file = readFileSync(filePath);
    JSON.parse(file.toString());

  } catch (e) {

    throw new Error(`Reading file '${filePath}' failed with Error: ${e.message}`);

  }

};

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

const createVariables = (args: string[]): Record<string, any> => {

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

  const { uri: proxyUri, host: proxyHost, port: proxyPort } = params.proxyUri ? checkUri(params.proxyUri) : { uri: 'http://localhost:3003', host: 'localhost', port: '3003' };
  const { uri: upstreamUri, host: upstreamHost, port: upstreamPort, scheme: upstreamScheme } = params.upstreamUri ? checkUri(params.upstreamUri) : { uri: 'http://localhost:3000', host: 'localhost', port: '3000', scheme: 'http:' };

  checkFile(params.openidConfigurationFilePath ?? 'assets/openid-configuration.json');
  checkFile(params.jwksFilePath ?? 'assets/jwks.json');

  return {
    'urn:dgt-id-proxy:variables:customConfigPath': params.config,
    'urn:dgt-id-proxy:variables:mainModulePath': params.mainModulePath,
    'urn:dgt-id-proxy:variables:proxyUri': proxyUri,
    'urn:dgt-id-proxy:variables:proxyHost': proxyHost,
    'urn:dgt-id-proxy:variables:proxyPort': proxyPort ?? '3003',
    'urn:dgt-id-proxy:variables:upstreamUri': upstreamUri,
    'urn:dgt-id-proxy:variables:upstreamHost': upstreamHost,
    'urn:dgt-id-proxy:variables:upstreamPort': upstreamPort ??'3000',
    'urn:dgt-id-proxy:variables:upstreamScheme': upstreamScheme,
    'urn:dgt-id-proxy:variables:openidConfigurationFilePath': params.openidConfigurationFilePath ? params.openidConfigurationFilePath : 'assets/openid-configuration.json',
    'urn:dgt-id-proxy:variables:jwksFilePath': params.jwksFilePath ? params.jwksFilePath : 'assets/jwks.json',
  };

};

const vars = createVariables(process.argv);

launch(vars);
