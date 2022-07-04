#!/usr/bin/env node

import * as path from 'path';
import { readFileSync } from 'fs';
import { ComponentsManager } from 'componentsjs';
import { NodeHttpServer } from '@digita-ai/handlersjs-http';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ConsoleLoggerFactory, getLogger, getLoggerFor, setLogger, setLoggerFactory } from '@digita-ai/handlersjs-logging';

/**
 * Checks a URI and returns an object containing:
 * - the URI
 * - the host
 * - the port
 * - the scheme
 *
 * @param { string } uri - The uri to check.
 * @returns The URI, host, port and scheme of the provided URI.
 */
export const checkUri = (uri: string): { uri: string; host: string; port: string; scheme: string } => {

  const httpUri = uri.match(/^https?:\/\//g) ? uri : 'http://' + uri ;

  try {

    const url = new URL(httpUri);
    const host = url.hostname;
    const port = url.port !== '' ? url.port : (url.protocol === 'http:' ? '80' : '443');
    const scheme = url.protocol;

    return ({
      uri: url.toString(),
      host,
      port,
      scheme,
    });

  } catch (e) {

    getLogger().error('Invalid uri parameter', e);

    throw new Error('Invalid uri parameter');

  }

};

/**
 * Reads a file using a filepath and parses the result if possible to return the content as a string.
 *
 * @param { string } filepath - The filepath to the file to read.
 */
export const checkFile = (filePath: string): void => {

  try {

    const file = readFileSync(filePath);
    JSON.parse(file.toString());

  } catch (e: any) {

    getLogger().error(`Reading file '${filePath}' failed with Error:`, e);

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
    ? path.isAbsolute(variables['urn:dgt-id-proxy:variables:mainModulePath'])
      ? variables['urn:dgt-id-proxy:variables:mainModulePath']
      : path.join(process.cwd(), variables['urn:dgt-id-proxy:variables:mainModulePath'])
    : path.join(__dirname, '../');

  const configPath = variables['urn:dgt-id-proxy:variables:customConfigPath']
    ? path.isAbsolute(variables['urn:dgt-id-proxy:variables:customConfigPath'])
      ? variables['urn:dgt-id-proxy:variables:customConfigPath']
      : path.join(process.cwd(), variables['urn:dgt-id-proxy:variables:customConfigPath'])
    : path.join(__dirname, '../config/presets/solid-compliant-opaque-access-tokens.json');

  const manager = await ComponentsManager.build({
    mainModulePath,
    logLevel: 'silly',
    typeChecking: false,
  });

  await manager.configRegistry.register(configPath);

  setLoggerFactory(new ConsoleLoggerFactory());
  setLogger(getLoggerFor('PROXY', 6, 6));

  const server: NodeHttpServer = await manager.instantiate('urn:handlersjs-http:default:NodeHttpServer', { variables });

  await server.start();

  getLogger().info(`Proxy server started on ${variables['urn:dgt-id-proxy:variables:proxyUri']}`);
  getLogger().info(`Proxy server server started with variables`, variables);

};

/**
 * Parses the command line arguments and returns the result.
 *
 * @param { string[] } args - The command line arguments.
 * @returns { Record<string, any> } - The parsed command line arguments.
 */
export const createVariables = (args: string[]): Record<string, any> => {

  const { argv: params } = yargs(hideBin(args))
    .usage('node ./dist/main.js [args]')
    .options({
      config: { type: 'string', alias: 'c' },
      urlWebIdFactoryClaim: { type: 'string', alias: 'C' },
      proxyUri: { type: 'string', alias: 'u' },
      upstreamUri: { type: 'string', alias: 'U' },
      mainModulePath: { type: 'string', alias: 'm' },
      openidConfigurationFilePath: { type: 'string', alias: 'o' },
      jwksFilePath: { type: 'string', alias: 'j' },
      redirectUri: { type: 'string', alias: 'r' },
      clientId: { type: 'string', alias: 'i' },
      clientSecret: { type: 'string', alias: 's' },
      proxyTokenUrl: { type: 'string', alias: 'P' },
      proxyClientUrl: { type: 'string', alias: 'L' },
      auth0Api: { type: 'string', alias: 'A' },
      appSecret: { type: 'string' },
      allowedWebIdsPath: { type: 'string', alias: 'webIds' }, // webids that are allowed to access api
    })
    .help();

  const { uri: proxyUri, host: proxyHost, port: proxyPort } = params.proxyUri ? checkUri(params.proxyUri) : { uri: 'http://localhost:3003/', host: 'localhost', port: '3003' };
  const { uri: upstreamUri, host: upstreamHost, port: upstreamPort, scheme: upstreamScheme } = params.upstreamUri ? checkUri(params.upstreamUri) : { uri: 'http://localhost:3000/', host: 'localhost', port: '3000', scheme: 'http:' };
  const urlWebIdFactoryClaim = params.urlWebIdFactoryClaim ?? ((params.proxUri ?? 'http://localhost:3003') + '/webid');
  const redirectUri = params.redirectUri ?? ((params.proxUri ?? 'http://localhost:3003') + '/redirect');
  const clientId = params.clientId;
  const clientSecret = params.clientSecret;
  const proxyTokenUrl = params.proxyTokenUrl ?? ((params.proxUri ?? 'http://localhost:3003') + '/oauth/token');
  const proxyClientUrl = params.proxyClientUrl ?? ((params.proxUri ?? 'http://localhost:3003') + '/oauth/client');
  const auth0Api = params.auth0Api;
  const appSecret = params.appSecret ?? 'testsecret';

  const mainModulePath = params.mainModulePath
    ? path.isAbsolute(params.mainModulePath)
      ? params.mainModulePath
      : path.join(process.cwd(), params.mainModulePath)
    : path.join(__dirname, '../');

  const configPath = params.config
    ? path.isAbsolute(params.config)
      ? params.config
      : path.join(process.cwd(), params.config)
    : path.join(__dirname, '../config/presets/solid-compliant-opaque-access-tokens.json');

  const openidConfigurationFilePath = params.openidConfigurationFilePath
    ? path.isAbsolute(params.openidConfigurationFilePath)
      ? params.openidConfigurationFilePath
      : path.join(process.cwd(), params.openidConfigurationFilePath)
    : path.join(mainModulePath, 'assets/openid-configuration.json');

  const jwksFilePath = params.jwksFilePath
    ? path.isAbsolute(params.jwksFilePath)
      ? params.jwksFilePath
      : path.join(process.cwd(), params.jwksFilePath)
    : path.join(mainModulePath, 'assets/jwks.json');

  const allowedWebIdsPath = params.allowedWebIdsPath
    ? path.isAbsolute(params.allowedWebIdsPath)
      ? params.allowedWebIdsPath
      : path.join(mainModulePath, params.allowedWebIdsPath)
    : path.join(mainModulePath, 'allowedWebIds.csv');

  const allowedWebIds = JSON.stringify(readFileSync(allowedWebIdsPath, 'utf8').split(',').map((webId) => webId.trim()));

  checkFile(openidConfigurationFilePath);
  checkFile(jwksFilePath);

  return {
    'urn:dgt-id-proxy:variables:customConfigPath': configPath,
    'urn:dgt-id-proxy:variables:mainModulePath': mainModulePath,
    'urn:dgt-id-proxy:variables:proxyUri': proxyUri,
    'urn:dgt-id-proxy:variables:proxyHost': proxyHost,
    'urn:dgt-id-proxy:variables:proxyPort': proxyPort,
    'urn:dgt-id-proxy:variables:upstreamUri': upstreamUri,
    'urn:dgt-id-proxy:variables:upstreamHost': upstreamHost,
    'urn:dgt-id-proxy:variables:upstreamPort': upstreamPort,
    'urn:dgt-id-proxy:variables:upstreamScheme': upstreamScheme,
    'urn:dgt-id-proxy:variables:openidConfigurationFilePath': openidConfigurationFilePath,
    'urn:dgt-id-proxy:variables:jwksFilePath': jwksFilePath,
    'urn:dgt-id-proxy:variables:urlWebIdFactoryClaim': urlWebIdFactoryClaim,
    'urn:dgt-id-proxy:variables:redirectUri': redirectUri,
    'urn:dgt-id-proxy:variables:clientId': clientId,
    'urn:dgt-id-proxy:variables:clientSecret': clientSecret,
    'urn:dgt-id-proxy:variables:proxyTokenUrl': proxyTokenUrl,
    'urn:dgt-id-proxy:variables:proxyClientUrl': proxyClientUrl,
    'urn:dgt-id-proxy:variables:auth0Api': auth0Api,
    'urn:dgt-id-proxy:variables:allowedWebIds': allowedWebIds,
    'urn:dgt-id-proxy:variables:appSecret': appSecret,
  };

};
