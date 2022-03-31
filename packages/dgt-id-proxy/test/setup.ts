/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConsoleLogger } from '@digita-ai/handlersjs-logging';

jest.mock('@digita-ai/handlersjs-logging', () => ({
  ... jest.requireActual('@digita-ai/handlersjs-logging') as any,
  getLogger: () => new ConsoleLogger('TEST', 6, 6),
  getLoggerFor: () => new ConsoleLogger('TEST', 6, 6),
}));
