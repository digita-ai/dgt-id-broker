jest.mock('fs', () => ({ readFileSync: jest.fn().mockImplementation((filename) => {

  if (filename === 'path') {

    throw new Error('mockError');

  } else {

    return Buffer.from(JSON.stringify({ text: 'some text' }));

  }

}) }));

import path from 'path';
import { readFileSync } from 'fs';
import { ComponentsManager } from 'componentsjs';
import { NodeHttpServer } from '@digita-ai/handlersjs-http';
import { checkFile, checkUri, createVariables, launch } from './main';

describe('Main.ts', () => {

  const mainModulePath = path.join(__dirname, '../');
  const configPath = path.join(__dirname, '../config/presets/auth0-config.json');
  const oidcPath = path.join(__dirname, '../assets/other-openid-config.json');
  const jwkPath = path.join(__dirname, '../assets/other-jwks.json');

  const variables = {
    'urn:dgt-id-proxy:variables:customConfigPath': configPath,
    'urn:dgt-id-proxy:variables:mainModulePath': mainModulePath,
    'urn:dgt-id-proxy:variables:proxyUri': 'http://localhost:3003/',
    'urn:dgt-id-proxy:variables:proxyHost': 'localhost',
    'urn:dgt-id-proxy:variables:proxyPort': '3003',
    'urn:dgt-id-proxy:variables:upstreamUri': 'https://digita-ai.eu.auth0.com/',
    'urn:dgt-id-proxy:variables:upstreamHost': 'digita-ai.eu.auth0.com',
    'urn:dgt-id-proxy:variables:upstreamPort': '443',
    'urn:dgt-id-proxy:variables:upstreamScheme': 'https:',
    'urn:dgt-id-proxy:variables:openidConfigurationFilePath': path.join(mainModulePath, 'assets/openid-configuration.json'),
    'urn:dgt-id-proxy:variables:jwksFilePath': path.join(mainModulePath, 'assets/jwks.json'),
    'urn:dgt-id-proxy:variables:urlWebIdFactoryClaim': 'http://localhost:3003/webid',
    'urn:dgt-id-proxy:variables:redirectUri': 'http://localhost:3003/redirect',
    'urn:dgt-id-proxy:variables:clientId': 'fx0Ujpt78FfdsFdgfs8fssAW3QWF',
    'urn:dgt-id-proxy:variables:clientSecret': 'SdfvZh7egyafNcwnj33KFy1xdsffFD8fdSW8xcDF8to',
    'urn:dgt-id-proxy:variables:proxyTokenUrl': 'http://localhost:3003/oauth/token',
    'urn:dgt-id-proxy:variables:proxyClientUrl': 'http://localhost:3003/oauth/client',
    'urn:dgt-id-proxy:variables:auth0Api': 'https:​//useid.eu.auth0.com/api/v2/',
  } as Record<string, any>;

  const handler = {
    handle: jest.fn(),
    canHandle: jest.fn(),
    safeHandle: jest.fn(),
  };

  let server;
  let manager;

  beforeEach(async () => {

    JSON.parse = jest.fn();

    server = new NodeHttpServer('localhost', 3000, handler);
    server.start = jest.fn();

    manager = {
      configRegistry: {
        register: jest.fn(),
      },
      instantiate: jest.fn().mockImplementation(async () =>  Promise.resolve(server)),
    };

    ComponentsManager.build = jest.fn().mockImplementation(async () =>  Promise.resolve(manager));

  });

  describe('checkUri', () => {

    it('should error when an invalid uri parameter was given', () => {

      expect(() => checkUri('http://')).toThrow('Invalid uri parameter');

    });

    it('should return a valid uri (with port 80 and http if no protocol was given)',  () => {

      expect(checkUri('digita')).toEqual({ uri: 'http://digita/', host: 'digita', port: '80', scheme: 'http:' });

    });

    it('should use port 443 if https is protocol and no port was provided',  () => {

      expect(checkUri('https://digita')).toEqual({ uri: 'https://digita/', host: 'digita', port: '443', scheme: 'https:' });

    });

    it('should not changed port if port was provided',  () => {

      expect(checkUri('https://digita:3000')).toEqual({ uri: 'https://digita:3000/', host: 'digita', port: '3000', scheme: 'https:' });

    });

  });

  describe('checkFile', () => {

    it('should error when reading the file failed',  () => {

      expect(() => checkFile('path')).toThrow(`Reading file 'path' failed with Error: mockError`);

    });

    it('should call readFileSync & json.parse without erroring', () => {

      checkFile('./files/text.txt');

      expect(readFileSync).toHaveBeenCalledWith('./files/text.txt');
      expect(JSON.parse).toHaveBeenCalledWith(JSON.stringify({ text: 'some text' }));

    });

  });

  describe('createVariables', () => {

    it('should return the variables with the given proxyUri & upstreamUri with added trailing slash', () => {

      expect(createVariables([ 'npm run start', '--', '-c', configPath, '-u', 'http://digita-ai.proxy.com', '-U', 'https://digita-ai.eu.auth0.com/', '-o', oidcPath, '-j', jwkPath ]))
        .toMatchObject({
          'urn:dgt-id-proxy:variables:proxyUri': 'http://digita-ai.proxy.com/',
          'urn:dgt-id-proxy:variables:proxyHost': 'digita-ai.proxy.com',
          'urn:dgt-id-proxy:variables:proxyPort': '80',
          'urn:dgt-id-proxy:variables:upstreamUri': 'https://digita-ai.eu.auth0.com/',
          'urn:dgt-id-proxy:variables:upstreamHost': 'digita-ai.eu.auth0.com',
          'urn:dgt-id-proxy:variables:upstreamPort': '443',
          'urn:dgt-id-proxy:variables:upstreamScheme': 'https:',
        });

    });

    it('should error when missing required arguments', () => {

      expect(() => createVariables([ 'npm run start' ])).toThrowError(TypeError);

    });

  });

  describe('launch', () => {

    it('should call build with __dirname if no mainModulePath provided', async () => {

      await launch({ ...variables, ['urn:dgt-id-proxy:variables:mainModulePath'] : undefined });
      expect(manager.instantiate).toHaveBeenCalledTimes(1);

      expect(ComponentsManager.build).toHaveBeenCalledWith({ mainModulePath, logLevel: 'silly', typeChecking: false });

    });

    it('should call build with process.cwd and mainModulePath if provided', async () => {

      await launch(variables);
      expect(manager.instantiate).toHaveBeenCalledTimes(1);

      expect(ComponentsManager.build).toHaveBeenCalledWith({ mainModulePath, logLevel: 'silly', typeChecking: false });

    });

    it('should call register with __dirname & default if no configPath was provided', async () => {

      const defaultConfigPath = path.join(__dirname, '../config/presets/solid-compliant-opaque-access-tokens.json');

      await launch({ ...variables, ['urn:dgt-id-proxy:variables:customConfigPath'] : undefined });

      expect(manager.instantiate).toHaveBeenCalledTimes(1);

      expect(manager.configRegistry.register).toHaveBeenCalledWith(defaultConfigPath);

    });

  });

});
