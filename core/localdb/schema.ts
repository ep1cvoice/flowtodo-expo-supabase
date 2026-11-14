/** Bump together with a new step in the migration. */
export const SCHEMA_VERSION = 2;

export const SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY NOT NULL,
      name_enc TEXT, name_iv TEXT, name_hash TEXT,
      color TEXT NOT NULL, icon TEXT NOT NULL, created_at TEXT NOT NULL,
      sync_state TEXT NOT NULL DEFAULT 'synced',
      rev INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY NOT NULL,
      name_enc TEXT, name_iv TEXT, name_hash TEXT,
      color TEXT NOT NULL, created_at TEXT NOT NULL,
      sync_state TEXT NOT NULL DEFAULT 'synced',
      rev INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY NOT NULL,
      title_enc TEXT, title_iv TEXT, description_enc TEXT, description_iv TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      scheduled TEXT, completed_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER,
      tag_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      sync_state TEXT NOT NULL DEFAULT 'synced',
      rev INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS tasks_done_sort_idx ON tasks (done, sort_order);
    CREATE INDEX IF NOT EXISTS tasks_completed_idx ON tasks (done, completed_at DESC, id DESC);
    CREATE TABLE IF NOT EXISTS pomodoros (
      id INTEGER PRIMARY KEY NOT NULL,
      task_id INTEGER,
      task_name_enc TEXT, task_name_iv TEXT,
      duration INTEGER NOT NULL,
      elapsed INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL, paused_at TEXT, ended_at TEXT,
      paused_on_logout INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      sync_state TEXT NOT NULL DEFAULT 'synced',
      rev INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS pomodoros_ended_idx ON pomodoros (ended_at DESC);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT);
    PRAGMA user_version = ${SCHEMA_VERSION};
  `;
