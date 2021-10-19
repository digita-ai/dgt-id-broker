import { Handler } from '@digita-ai/handlersjs-core';
import { ParsedJSON } from '../util/parsed-json';

export abstract class WebIdFactory extends Handler<ParsedJSON, string> {}
