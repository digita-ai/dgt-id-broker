import { Observable } from 'rxjs';

export interface WebIDFactory {
  handle(input: { [x: string]: string }, intermediateOutput?: string): Observable<string>;
  canHandle(input: { [x: string]: string }, intermediateOutput?: string): Observable<boolean>;
}

