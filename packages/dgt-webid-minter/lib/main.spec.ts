import path from 'path';
import { NodeHttpServer } from '@digita-ai/handlersjs-http';
import { ComponentsManager } from 'componentsjs';
import { checkUri, createVariables, launch } from './main';

describe('Main.ts', () => {

  const mainModulePath = path.join(__dirname, '../');
  const configPath = path.join(mainModulePath, 'config/minter-server-config.json');

  const variables = {
    'urn:dgt-webid-minter:variables:customConfigPath': '../config/minter-server-config.json',
    'urn:dgt-webid-minter:variables:mainModulePath': mainModulePath,
    'urn:dgt-webid-minter:variables:minterUri': 'http://localhost:3004',
    'urn:dgt-webid-minter:variables:minterHost': 'localhost',
    'urn:dgt-webid-minter:variables:minterPort': '3004',
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

      expect(checkUri('digita')).toEqual({ uri: 'http://digita', host: 'digita', port: '80', scheme: 'http:' });

    });

    it('should use port 443 if https is protocol and no port was provided',  () => {

      expect(checkUri('https://digita')).toEqual({ uri: 'https://digita', host: 'digita', port: '443', scheme: 'https:' });

    });

    it('should not changed port if port was provided',  () => {

      expect(checkUri('https://digita:3000')).toEqual({ uri: 'https://digita:3000', host: 'digita', port: '3000', scheme: 'https:' });

    });

  });

  describe('createVariables', () => {

    it('should return the correct variables of the given arguments', () => {

      expect(createVariables([ 'npm run start', '--', '-c', configPath ]))
        .toEqual({
          'urn:dgt-webid-minter:variables:customConfigPath': '../config/minter-server-config.json',
          'urn:dgt-webid-minter:variables:mainModulePath': mainModulePath,
          'urn:dgt-webid-minter:variables:minterUri': 'http://localhost:3004',
          'urn:dgt-webid-minter:variables:minterHost': 'localhost',
          'urn:dgt-webid-minter:variables:minterPort': '3004',
        });

    });

    it('should return the variables with the given minterUri', () => {

      expect(createVariables([ 'npm run start', '--', '-c', configPath, '-u', 'http://digita-ai.minter.com' ]))
        .toMatchObject({
          'urn:dgt-webid-minter:variables:minterUri': 'http://digita-ai.minter.com',
          'urn:dgt-webid-minter:variables:minterHost': 'digita-ai.minter.com',
          'urn:dgt-webid-minter:variables:minterPort': '80',
        });

    });

    it('should return 3004 as minterPort if none were provided', () => {

      expect(createVariables([ 'npm run start', '--', '-c', configPath ]))
        .toMatchObject({
          'urn:dgt-webid-minter:variables:minterPort': '3004',
        });

    });

  });

  describe('launch', () => {

    it('should call build with __dirname if no mainModulePath provided', async () => {

      await launch({ ...variables, ['urn:dgt-webid-minter:variables:mainModulePath'] : undefined });
      expect(manager.instantiate).toHaveBeenCalledTimes(1);

      expect(ComponentsManager.build).toHaveBeenCalledWith({ mainModulePath, logLevel: 'silly' });

    });

    it('should call build with process.cwd and mainModulePath if provided', async () => {

      await launch(variables);
      expect(manager.instantiate).toHaveBeenCalledTimes(1);

      expect(ComponentsManager.build).toHaveBeenCalledWith({ mainModulePath, logLevel: 'silly' });

    });

    it('should call register with __dirname & default if no configPath was provided', async () => {

      const defaultConfigPath = path.join(__dirname, '../config/minter-server-config.json');

      await launch({ ...variables, ['urn:dgt-webid-minter:variables:customConfigPath'] : undefined });

      expect(manager.instantiate).toHaveBeenCalledTimes(1);

      expect(manager.configRegistry.register).toHaveBeenCalledWith(defaultConfigPath);

    });

  });

});

