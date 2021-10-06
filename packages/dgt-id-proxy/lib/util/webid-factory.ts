import { Observable } from 'rxjs';

export interface WebIdFactory {
  handle(input: { [x: string]: string }, intermediateOutput?: string): Observable<string>;
  canHandle(input: { [x: string]: string }, intermediateOutput?: string): Observable<boolean>;
  getClaim(): string;
}

