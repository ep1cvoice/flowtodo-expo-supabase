import type { LocalDb } from '@/core/localdb/openUserDb';

/**
 * expo-sqlite shares one connection per database, and `withTransactionAsync` is a plain
 * BEGIN/COMMIT on that connection: any statement another async flow issues while it is open
 * joins the transaction (and is rolled back with it), and a second BEGIN fails with
 * "cannot start a transaction within a transaction". `withExclusiveTransactionAsync` is not
 * available on web, so every local write goes through this per-database queue instead.
 *
 * Not re-entrant: never call `withDbLock` / `writeTransaction` from inside a locked task.
 */
const queues = new WeakMap<object, Promise<void>>();

export function withDbLock<T>(db: LocalDb, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(db) ?? Promise.resolve();
  const run = previous.then(task);
  queues.set(
    db,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
}

/** A transaction that no other local write can interleave with. */
export function writeTransaction(db: LocalDb, task: () => Promise<void>): Promise<void> {
  return withDbLock(db, () => db.withTransactionAsync(task));
}
