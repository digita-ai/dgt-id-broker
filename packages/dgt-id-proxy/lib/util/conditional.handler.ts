import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HandlerArgumentError, Handler } from '@digita-ai/handlersjs-core';

export class TrivialHandler<T> implements Handler<T, T> {

  handle(input: T): Observable<T> {

    return of(input);

  }

  canHandle(input: T): Observable<boolean> {

    return of(true);

  }

  /* istanbul ignore next */
  safeHandle(input: T, intermediateOutput: T): Observable<T> {

    throw new Error('Method not implemented.');

  }

}

export class ConditionalHandler<T, St, Sf = T> implements Handler<T, St | Sf> {

  constructor(
    public condition: Handler<T, boolean>,
    public successHandler: Handler<T, St>,
    public failureHandler: Handler<T, Sf>,
  ) {

    if (!condition) { throw new HandlerArgumentError('Argument condition should be set.', condition); }

    if (!successHandler) { throw new HandlerArgumentError('Argument successHandler should be set.', successHandler); }

    if (!failureHandler) { throw new HandlerArgumentError('Argument failureHandler should be set.', failureHandler); }

  }

  handle(input: T): Observable<St | Sf> {

    return this.condition.handle(input).pipe(
      switchMap((success) => success
        ? this.successHandler.handle(input)
        : this.failureHandler.handle(input)),
    );

  }

  /* istanbul ignore next */
  canHandle(input: T, intermediateOutput?: St | Sf): Observable<boolean> {

    throw new Error('Method not implemented.');

  }
  /* istanbul ignore next */
  safeHandle(input: T, intermediateOutput: St | Sf): Observable<St | Sf> {

    throw new Error('Method not implemented.');

  }

}
