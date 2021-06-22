import { checkFile, checkUri } from './main';

// jest.mock('fs', () => ({ readFile: jest.fn().mockResolvedValue(Buffer.from(JSON.stringify({ 'text': 'some text' }))) }));

describe('Main.ts', () => {

  const protocol = 'http://';
  const hostname = 'localhost';
  const port = '3000';

  const uri = `${protocol}${hostname}:${port}/token`;

  beforeEach(async () => {

    jest.useFakeTimers();

  });

  describe('checkUri', () => {

    fit('should error when an invalid uri parameter was given', async () => {

      await expect(() => checkUri('http://')).toThrow('Invalid uri parameter');

    });

    it('should return a valid uri', async () => {

      await expect(checkUri('digita')).toEqual({ uri: 'http://digita', host: 'digita', port: '80', scheme: 'http:' });

    });

  });

  describe('checkFile', () => {

    it('should error when reading the file failed', async () => {

      await expect(() => checkFile('path')).toThrow(`Reading file 'path' failed with Error: ENOENT: no such file or directory, open 'path'`);

    });

    // it('should parse', () => {

    //   expect(checkFile('./files/text.txt')).toEqual({ 'text': 'some text' });

    // });

  });

});
