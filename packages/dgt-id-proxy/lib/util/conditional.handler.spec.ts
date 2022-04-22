import { lastValueFrom, of } from 'rxjs';
import { ConditionalHandler, TrivialHandler } from './conditional.handler';

describe('ConditionalHandler', () => {

  const condition = {

    handle: jest.fn(() => of(true)),
    canHandle: jest.fn(),
    safeHandle: jest.fn(),

  };

  const succesHandler = {

    handle: jest.fn(() => of(true)),
    canHandle: jest.fn(),
    safeHandle: jest.fn(),

  };

  const failureHandler = {

    handle: jest.fn(() => of(false)),
    canHandle: jest.fn(),
    safeHandle: jest.fn(),

  };

  const conditionalHandler = new ConditionalHandler(condition, succesHandler, failureHandler);

  it('should be correctly instantiated', () => {

    expect(conditionalHandler).toBeTruthy();

  });

  it('should error when no condition was provided', () => {

    expect(() => new ConditionalHandler(undefined, succesHandler, failureHandler)).toThrow('Argument condition should be set.');
    expect(() => new ConditionalHandler(null, succesHandler, failureHandler)).toThrow('Argument condition should be set.');

  });

  it('should error when no successHandler was provided', () => {

    expect(() => new ConditionalHandler(condition, undefined, failureHandler)).toThrow('Argument successHandler should be set.');
    expect(() => new ConditionalHandler(condition, null, failureHandler)).toThrow('Argument successHandler should be set.');

  });

  it('should error when no failureHandler was provided', () => {

    expect(() => new ConditionalHandler(condition, succesHandler, undefined)).toThrow('Argument failureHandler should be set.');
    expect(() => new ConditionalHandler(condition, succesHandler, null)).toThrow('Argument failureHandler should be set.');

  });

  describe('handle', () => {

    it('should call the condition handler', async () => {

      await lastValueFrom(conditionalHandler.handle(true));

      expect(condition.handle).toHaveBeenCalledTimes(1);
      expect(succesHandler.handle).toHaveBeenCalledWith(true);

    });

    it('should call the success handler when the condition is true', async () => {

      await lastValueFrom(conditionalHandler.handle(true));

      expect(succesHandler.handle).toHaveBeenCalledTimes(2);
      expect(succesHandler.handle).toHaveBeenCalledWith(true);

    });

    it('should call the failure handler when the condition is false', async () => {

      condition.handle.mockReturnValueOnce(of(false));

      await lastValueFrom(conditionalHandler.handle(false));

      expect(failureHandler.handle).toHaveBeenCalledTimes(1);
      expect(failureHandler.handle).toHaveBeenCalledWith(false);

    });

  });

});

describe('TrivialHandler', () => {

  const handler = new TrivialHandler();

  it('should be correctly instantiated', () => {

    expect(handler).toBeTruthy();

  });

  describe('handle', () => {

    it('should return true', async () => {

      await expect(lastValueFrom(handler.handle(true))).resolves.toBe(true);

    });

  });

  describe('canHandle', () => {

    it('should return true', async () => {

      await expect(lastValueFrom(handler.canHandle(true))).resolves.toBe(true);

    });

  });

});
