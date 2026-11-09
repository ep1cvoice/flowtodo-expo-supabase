import { strings } from '@/shared/lib/strings';
export class TimeoutError extends Error {
  constructor(message = strings.common.requestTimedOut) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/** Rejects if `promise` does not settle within `ms`. */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label = strings.common.request
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new TimeoutError(`${label} timed out after ${ms}ms`));
    }, ms);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (err) => {
        clearTimeout(id);
        reject(err);
      }
    );
  });
}
