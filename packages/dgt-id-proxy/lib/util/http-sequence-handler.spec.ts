import { lastValueFrom, of } from 'rxjs';
import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { Handler } from '@digita-ai/handlersjs-core';
import { HttpSequenceHandler } from './http-sequence-handler';

describe('HttpSequenceHandler', () => {

  const mockHandler: Handler<void, void> = { handle: (input: void) => of(void(0)) };
  let httpSequenceHandler: HttpSequenceHandler<HttpHandlerContext>;

  let mockContext: HttpHandlerContext;

  beforeEach(async () => {

    httpSequenceHandler = new HttpSequenceHandler([ mockHandler ]);

    mockContext = {
      request: {
        method: 'GET',
        url: new URL('http://localhost:3000/'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      },
    };

  });

  afterEach(() => {

    jest.clearAllMocks();

  });

  it('should be correctly instantiated', () => {

    expect(httpSequenceHandler).toBeTruthy();

  });

  describe('handle', () => {

    it('should call the nested handlers handler', async () => {

      mockHandler.handle = jest.fn().mockReturnValue(of(void(0)));

      await lastValueFrom(httpSequenceHandler.handle(mockContext));

      expect(mockHandler.handle).toHaveBeenCalledTimes(1);

    });

  });

});
