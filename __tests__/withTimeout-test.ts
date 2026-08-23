import { TimeoutError, withTimeout } from '@/lib/withTimeout';

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 200, 'ok')).resolves.toBe(42);
  });

  it('rejects with TimeoutError when the promise hangs', async () => {
    const hang = new Promise<number>(() => {});
    await expect(withTimeout(hang, 50, 'hang')).rejects.toBeInstanceOf(TimeoutError);
  });
});
