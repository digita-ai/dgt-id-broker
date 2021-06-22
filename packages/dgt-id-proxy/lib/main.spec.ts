jest.mock('fs', () => ({ readFileSync: jest.fn().mockImplementation((filename) => {

  if (filename === 'path') {

    throw new Error('mockError');

  } else {

    return Buffer.from(JSON.stringify({ text: 'some text' }));

  }

}) }));

import { readFileSync } from 'fs';
import { checkFile, checkUri, createVariables, launch } from './main';

describe('Main.ts', () => {

  const protocol = 'http://';
  const hostname = 'localhost';
  const port = '3000';

  const uri = `${protocol}${hostname}:${port}/token`;

  beforeEach(async () => {

    JSON.parse = jest.fn();

  });

  describe('checkUri', () => {

    it('should error when an invalid uri parameter was given', () => {

      expect(() => checkUri('http://')).toThrow('Invalid uri parameter');

    });

    it('should return a valid uri',  () => {

      expect(checkUri('digita')).toEqual({ uri: 'http://digita', host: 'digita', port: '80', scheme: 'http:' });

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

  // describe('createVariables', () => {

  //   createVariables()

  // });

});
