import { SCHEMA_SQL } from '@/core/localdb/schema';

/** In-memory stand-in for expo-sqlite's async API (backed by Node's built-in SQLite). */
export function createMemoryDb() {
  // Node's built-in SQLite (no @types/node in this project), hence require + loose typing.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:') as any;
  db.exec(SCHEMA_SQL);
  const flat = (params: unknown[]) =>
    (params.length === 1 && Array.isArray(params[0]) ? params[0] : params) as never[];
  return {
    execAsync: async (sql: string) => void db.exec(sql),
    getAllAsync: async <T = any>(sql: string, ...params: unknown[]) =>
      db.prepare(sql).all(...flat(params)) as T[],
    getFirstAsync: async <T = any>(sql: string, ...params: unknown[]) =>
      (db.prepare(sql).get(...flat(params)) ?? null) as T | null,
    runAsync: async (sql: string, ...params: unknown[]) => {
      const r = db.prepare(sql).run(...flat(params));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    withTransactionAsync: async (task: () => Promise<void>) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
