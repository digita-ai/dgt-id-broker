import { Observable } from 'rxjs';

export interface WebIdFactory {
  handle(input: { [x: string]: string | number }): Observable<string>;
  canHandle(input: { [x: string]: string | number }): Observable<boolean>;
}

