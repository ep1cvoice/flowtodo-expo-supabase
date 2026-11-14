import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, SCHEMA_VERSION } from '@/core/localdb/schema';
import { isWeb } from '@/shared/lib/platform';

export type LocalDb = SQLite.SQLiteDatabase;

const opened = new Map<string, Promise<LocalDb>>();

async function migrate(db: LocalDb) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((row?.user_version ?? 0) >= SCHEMA_VERSION) return;
  // WAL is a native-only optimisation; the web VFS (OPFS) manages journaling itself.
  if (!isWeb) await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(SCHEMA_SQL);
}

/**
 * One database file per user, so accounts never see each other's rows. Everything stored
 * in it is already end-to-end encrypted (ciphertext + IV), same as on the server.
 */
export function openUserDb(userId: string): Promise<LocalDb> {
  let db = opened.get(userId);
  if (!db) {
    db = SQLite.openDatabaseAsync(`flowtodo-${userId}.db`).then(async (database) => {
      await migrate(database);
      return database;
    });
    // Do not cache a failed open.
    db.catch(() => opened.delete(userId));
    opened.set(userId, db);
  }
  return db;
}
