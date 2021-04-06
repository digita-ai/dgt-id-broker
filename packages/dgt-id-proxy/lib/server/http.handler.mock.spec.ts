import { HttpHandlerContext } from '@digita-ai/handlersjs-http';
import { MockHttpHandler } from './http.handler.mock';

describe('MockHttpHandler', () => {
  let handler: MockHttpHandler;
  let context: HttpHandlerContext;

  beforeEach(() => {
    handler = new MockHttpHandler();
    context = { request: { headers: {}, method: '', path: '' } };
  });

  it('should be correctly instantiated', () => {
    expect(handler).toBeTruthy();
  });

  describe('handle()', () => {
    it('handle() should return a response with body: "some mock output", status: 200, header: {}', () => {
      expect(handler.handle(context).toPromise()).resolves.toEqual({ body: 'some mock output', status: 200, headers: {} });
    });
    it('handle() should throw an error when called with null or undefined', () => {
      expect(handler.handle(null).toPromise()).rejects.toThrow('Context cannot be null or undefined');
      expect(handler.handle(undefined).toPromise()).rejects.toThrow('Context cannot be null or undefined');
    });
  });

  describe('canHandle()', () => {
    it('should return true if context is not undefined', () => {
      expect(handler.canHandle(context).toPromise()).resolves.toEqual(true);
    });

    it('should throw an error when called with null or undefined', () => {
      expect(handler.canHandle(null).toPromise()).rejects.toThrow('Context cannot be null or undefined');
      expect(handler.canHandle(undefined).toPromise()).rejects.toThrow('Context cannot be null or undefined');
    });
  });
});
