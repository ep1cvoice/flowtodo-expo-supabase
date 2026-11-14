import { openUserDb, type LocalDb } from '@/core/localdb/openUserDb';
import {
  COMPLETED_PAGE_SIZE,
  getCompletedCursor,
  sortCompletedTasks,
  type CompletedCursor,
} from '@/features/tasks/lib/completedPagination';
import { encryptedColumns } from '@/core/crypto/encryptedColumns';
import { encryptTaskFields } from '@/features/tasks/lib/encryptTaskFields';
import { seedDemoData as seedDemoDataRemote } from '@/features/tasks/lib/seedDemoData';
import {
  buildLabelLookup,
  mapCategory,
  mapCategoryOrPlaceholder,
  mapTag,
  mapTagOrPlaceholder,
  mapTaskOrPlaceholder,
  type LabelLookup,
  type TaskQueryRow,
} from '@/features/tasks/lib/taskMappers';
import { newLocalId } from '@/features/tasks/lib/store/localId';
import {
  countPending,
  hasPulled,
  normalizeTimestamp,
  pullAll,
  pushPending,
  syncOnce,
} from '@/features/tasks/lib/store/syncEngine';
import {
  IDLE_SYNC_STATUS,
  type SyncStatus,
  type TaskStore,
} from '@/features/tasks/lib/store/types';
import { errorMessage } from '@/shared/lib/errorMessage';
import { logger } from '@/shared/lib/logger';
import { isKnownOffline } from '@/shared/lib/connectivity';
import { strings } from '@/shared/lib/strings';
import { withTimeout } from '@/shared/lib/withTimeout';
import type { Category, Tag, Task } from '@/types';
import type { Database } from '@/types/database';

type CategoryRow = Database['public']['Tables']['categories']['Row'];
type TagRow = Database['public']['Tables']['tags']['Row'];

interface LocalTaskRow {
  id: number;
  title_enc: string | null;
  title_iv: string | null;
  description_enc: string | null;
  description_iv: string | null;
  done: number;
  scheduled: string | null;
  completed_at: string | null;
  sort_order: number;
  category_id: number | null;
  tag_ids: string;
  created_at: string;
  updated_at: string;
}

function toQueryRow(userId: string, row: LocalTaskRow): TaskQueryRow {
  return {
    id: row.id,
    user_id: userId,
    title_enc: row.title_enc,
    title_iv: row.title_iv,
    description_enc: row.description_enc,
    description_iv: row.description_iv,
    done: row.done === 1,
    scheduled: row.scheduled,
    completed_at: row.completed_at,
    sort_order: row.sort_order,
    category_id: row.category_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    task_tags: (JSON.parse(row.tag_ids) as number[]).map((tag_id) => ({ tag_id })),
  };
}

const mapRows = (
  userId: string,
  rows: LocalTaskRow[],
  dek: Uint8Array | null,
  labels: LabelLookup
): Task[] => rows.map((row) => mapTaskOrPlaceholder(toQueryRow(userId, row), dek, labels));

const LIVE = `sync_state != 'deleted'`;
const TOUCH = `sync_state = 'dirty', rev = rev + 1, updated_at = ?`;

/** A round that hangs on a dead connection must not leave the status on "syncing" forever. */
const SYNC_TIMEOUT_MS = 30_000;

/**
 * A failed round is retried automatically with a growing delay: right after the connection
 * returns, the first requests often still fail (radio not ready, access token not refreshed).
 */
const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000, 60_000];
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const retryAttempts = new Map<string, number>();

const listeners = new Set<() => void>();
const statusListeners = new Set<() => void>();
const inFlight = new Map<string, Promise<void>>();
const rerun = new Set<string>();
let status: SyncStatus = IDLE_SYNC_STATUS;

function notify() {
  listeners.forEach((l) => l());
}

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  statusListeners.forEach((l) => l());
}

async function refreshPending(userId: string) {
  try {
    setStatus({ pending: await countPending(await openUserDb(userId)) });
  } catch (err) {
    logger.warn('Could not count pending changes:', errorMessage(err));
  }
}

function clearRetry(userId: string) {
  const timer = retryTimers.get(userId);
  if (timer) clearTimeout(timer);
  retryTimers.delete(userId);
}

function scheduleRetry(userId: string) {
  // Offline: the reconnect handler starts the next round, so there is nothing to poll for.
  if (retryTimers.has(userId) || isKnownOffline()) return;
  const attempt = retryAttempts.get(userId) ?? 0;
  retryAttempts.set(userId, attempt + 1);
  const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
  retryTimers.set(
    userId,
    setTimeout(() => {
      retryTimers.delete(userId);
      requestSync(userId);
    }, delay)
  );
}

/** Test helper: drops pending retries and their backoff state. */
export function cancelSyncRetries() {
  retryTimers.forEach((timer) => clearTimeout(timer));
  retryTimers.clear();
  retryAttempts.clear();
}

async function runSync(userId: string): Promise<void> {
  const db = await openUserDb(userId);
  setStatus({ syncing: true });
  try {
    const pushError = await withTimeout(syncOnce(db, userId), SYNC_TIMEOUT_MS, 'sync');
    setStatus({
      error: pushError?.message ?? null,
      lastSyncedAt: pushError ? status.lastSyncedAt : new Date().toISOString(),
    });
    if (pushError) {
      scheduleRetry(userId);
    } else {
      retryAttempts.delete(userId);
    }
  } catch (err) {
    setStatus({ error: errorMessage(err) });
    scheduleRetry(userId);
    throw err;
  } finally {
    setStatus({ syncing: false });
    await refreshPending(userId);
    notify();
  }
}

/** Single flight per user; a request arriving mid-sync schedules exactly one more round. */
function requestSync(userId: string) {
  void refreshPending(userId);
  // Known to be offline: nothing to wait for. Changes stay pending until the reconnect sync.
  if (isKnownOffline()) return;
  clearRetry(userId); // this request replaces any scheduled retry
  if (inFlight.has(userId)) {
    rerun.add(userId);
    return;
  }
  const run = runSync(userId)
    .catch((err) => logger.warn('Sync failed:', errorMessage(err)))
    .finally(() => {
      inFlight.delete(userId);
      if (rerun.delete(userId)) requestSync(userId);
    });
  inFlight.set(userId, run);
}

/** Pushes everything pending and resolves once it reached the server; throws otherwise. */
async function flush(userId: string) {
  if (isKnownOffline()) throw new Error(strings.common.noConnection);
  await inFlight.get(userId);
  const db = await openUserDb(userId);
  if ((await countPending(db)) === 0) return;
  await pushPending(db, userId);
  await refreshPending(userId);
}

/** Awaits the first full pull of an account (a new device has nothing local yet). */
async function ensureInitialPull(db: LocalDb, userId: string) {
  if (await hasPulled(db)) return;
  await pullAll(db, userId);
}

async function loadLabels(db: LocalDb, dek: Uint8Array | null) {
  const categoryRows = await db.getAllAsync<CategoryRow>(`SELECT * FROM categories WHERE ${LIVE}`);
  const tagRows = await db.getAllAsync<TagRow>(`SELECT * FROM tags WHERE ${LIVE}`);
  // Names are encrypted, so sort after decrypting.
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const categories: Category[] = categoryRows
    .map((r) => mapCategoryOrPlaceholder(r, dek))
    .sort(byName);
  const tags: Tag[] = tagRows.map((r) => mapTagOrPlaceholder(r, dek)).sort(byName);
  return { categories, tags, labels: buildLabelLookup(categories, tags) };
}

async function readCompletedPage(
  db: LocalDb,
  userId: string,
  cursor: CompletedCursor | null,
  dek: Uint8Array | null,
  labels: LabelLookup
) {
  const rows = cursor
    ? await db.getAllAsync<LocalTaskRow>(
        `SELECT * FROM tasks WHERE ${LIVE} AND done = 1 AND completed_at IS NOT NULL
           AND (completed_at < ? OR (completed_at = ? AND id < ?))
         ORDER BY completed_at DESC, id DESC LIMIT ?`,
        cursor.completedAt,
        cursor.completedAt,
        cursor.id,
        COMPLETED_PAGE_SIZE + 1
      )
    : await db.getAllAsync<LocalTaskRow>(
        `SELECT * FROM tasks WHERE ${LIVE} AND done = 1 AND completed_at IS NOT NULL
         ORDER BY completed_at DESC, id DESC LIMIT ?`,
        COMPLETED_PAGE_SIZE + 1
      );
  const tasks = mapRows(userId, rows, dek, labels);
  const hasMore = tasks.length > COMPLETED_PAGE_SIZE;
  const page = hasMore ? tasks.slice(0, COMPLETED_PAGE_SIZE) : tasks;
  const nextCursor = page.length > 0 ? getCompletedCursor(page[page.length - 1]) : null;
  return { page, hasMore, nextCursor };
}

const now = () => new Date().toISOString();

export const localTaskStore: TaskStore = {
  localFirst: true,

  async fetchTasksSnapshot(userId, dek) {
    const db = await openUserDb(userId);
    await ensureInitialPull(db, userId);
    const { categories, tags, labels } = await loadLabels(db, dek);
    const active = await db.getAllAsync<LocalTaskRow>(
      `SELECT * FROM tasks WHERE ${LIVE} AND done = 0 ORDER BY sort_order ASC`
    );
    const count = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM tasks WHERE ${LIVE} AND done = 1`
    );
    const completed = await readCompletedPage(db, userId, null, dek, labels);
    const completedTasks = sortCompletedTasks(completed.page);
    return {
      categories,
      tags,
      activeTasks: mapRows(userId, active, dek, labels),
      completedTasks,
      completedCount: count?.n ?? completedTasks.length,
      nextCursor: completed.nextCursor,
      hasMore: completed.hasMore,
    };
  },

  async fetchCompletedPage(userId, cursor, dek, labels) {
    return readCompletedPage(await openUserDb(userId), userId, cursor, dek, labels);
  },

  async fetchTaskById(userId, id, dek, labels) {
    const db = await openUserDb(userId);
    const row = await db.getFirstAsync<LocalTaskRow>(
      `SELECT * FROM tasks WHERE id = ? AND ${LIVE}`,
      id
    );
    return row ? mapTaskOrPlaceholder(toQueryRow(userId, row), dek, labels) : null;
  },

  async seedDemoData(userId, dek) {
    // Seeding is a one-time, server-side atomic RPC, so it needs a connection; the result is
    // then pulled into the local replica.
    const seeded = await seedDemoDataRemote(userId, dek);
    if (seeded) await pullAll(await openUserDb(userId), userId);
    return seeded;
  },

  async insertTask(o) {
    const db = await openUserDb(o.userId);
    const enc = await encryptTaskFields(o.dek, o.title, o.description);
    const id = newLocalId();
    const ts = now();
    await db.runAsync(
      `INSERT INTO tasks (id, title_enc, title_iv, description_enc, description_iv, done,
         scheduled, completed_at, sort_order, category_id, tag_ids, created_at, updated_at,
         sync_state, rev)
       VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?, ?, ?, ?, 'dirty', 1)`,
      id,
      enc.title_enc,
      enc.title_iv,
      enc.description_enc,
      enc.description_iv,
      o.scheduled,
      o.sortOrder,
      o.categoryId,
      JSON.stringify(o.tagIds),
      ts,
      ts
    );
    requestSync(o.userId);
    return id;
  },

  async updateTask(o) {
    const db = await openUserDb(o.userId);
    const enc = await encryptTaskFields(o.dek, o.title, o.description);
    const result = await db.runAsync(
      `UPDATE tasks SET category_id = ?, title_enc = ?, title_iv = ?, description_enc = ?,
         description_iv = ?, tag_ids = ?, ${TOUCH}
       WHERE id = ? AND ${LIVE}`,
      o.categoryId,
      enc.title_enc,
      enc.title_iv,
      enc.description_enc,
      enc.description_iv,
      JSON.stringify(o.tagIds),
      now(),
      o.id
    );
    if (result.changes === 0) throw new Error('Task not found');
    requestSync(o.userId);
  },

  async insertCategory(userId, dek, input) {
    const db = await openUserDb(userId);
    const enc = await encryptedColumns(dek, 'name', input.name, { hash: true });
    const existing = await db.getFirstAsync<CategoryRow>(
      `SELECT * FROM categories WHERE name_hash = ? AND ${LIVE}`,
      enc.name_hash
    );
    if (existing) throw new Error('A category with this name already exists');
    const id = newLocalId();
    await db.runAsync(
      `INSERT INTO categories (id, name_enc, name_iv, name_hash, color, icon, created_at, sync_state, rev)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'dirty', 1)`,
      id,
      enc.name_enc,
      enc.name_iv,
      enc.name_hash,
      input.color,
      String(input.icon),
      now()
    );
    const row = await db.getFirstAsync<CategoryRow>(`SELECT * FROM categories WHERE id = ?`, id);
    requestSync(userId);
    return mapCategory({ ...row!, user_id: userId }, dek);
  },

  async insertTag(userId, dek, input) {
    const db = await openUserDb(userId);
    const enc = await encryptedColumns(dek, 'name', input.name, { hash: true });
    const existing = await db.getFirstAsync<TagRow>(
      `SELECT * FROM tags WHERE name_hash = ? AND ${LIVE}`,
      enc.name_hash
    );
    if (existing) throw new Error('A tag with this name already exists');
    const id = newLocalId();
    await db.runAsync(
      `INSERT INTO tags (id, name_enc, name_iv, name_hash, color, created_at, sync_state, rev)
       VALUES (?, ?, ?, ?, ?, ?, 'dirty', 1)`,
      id,
      enc.name_enc,
      enc.name_iv,
      enc.name_hash,
      input.color,
      now()
    );
    const row = await db.getFirstAsync<TagRow>(`SELECT * FROM tags WHERE id = ?`, id);
    requestSync(userId);
    return mapTag({ ...row!, user_id: userId }, dek);
  },

  async deleteCategory(userId, id) {
    const db = await openUserDb(userId);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE categories SET sync_state = 'deleted', rev = rev + 1 WHERE id = ?`,
        id
      );
      // The server nulls these on delete (ON DELETE SET NULL); mirror it without dirtying.
      await db.runAsync(`UPDATE tasks SET category_id = NULL WHERE category_id = ?`, id);
    });
    requestSync(userId);
  },

  async deleteTag(userId, id) {
    const db = await openUserDb(userId);
    await db.withTransactionAsync(async () => {
      await db.runAsync(`UPDATE tags SET sync_state = 'deleted', rev = rev + 1 WHERE id = ?`, id);
      const tasks = await db.getAllAsync<{ id: number; tag_ids: string }>(
        `SELECT id, tag_ids FROM tasks WHERE tag_ids != '[]'`
      );
      for (const task of tasks) {
        const ids = JSON.parse(task.tag_ids) as number[];
        if (!ids.includes(id)) continue;
        await db.runAsync(
          `UPDATE tasks SET tag_ids = ? WHERE id = ?`,
          JSON.stringify(ids.filter((t) => t !== id)),
          task.id
        );
      }
    });
    requestSync(userId);
  },

  async setTaskScheduled(userId, id, scheduled) {
    const db = await openUserDb(userId);
    await db.runAsync(
      `UPDATE tasks SET scheduled = ?, ${TOUCH} WHERE id = ? AND ${LIVE}`,
      scheduled,
      now(),
      id
    );
    requestSync(userId);
  },

  async setTaskCompletedAt(userId, id, completedAt) {
    const db = await openUserDb(userId);
    await db.runAsync(
      `UPDATE tasks SET completed_at = ?, done = ?, ${TOUCH} WHERE id = ? AND ${LIVE}`,
      normalizeTimestamp(completedAt),
      completedAt ? 1 : 0,
      now(),
      id
    );
    requestSync(userId);
  },

  async deleteTask(userId, id) {
    const db = await openUserDb(userId);
    await db.runAsync(`UPDATE tasks SET sync_state = 'deleted', rev = rev + 1 WHERE id = ?`, id);
    requestSync(userId);
  },

  async deleteTasksByDone(userId, done) {
    const db = await openUserDb(userId);
    await db.runAsync(
      `UPDATE tasks SET sync_state = 'deleted', rev = rev + 1 WHERE done = ? AND ${LIVE}`,
      done ? 1 : 0
    );
    requestSync(userId);
  },

  async updateSortOrders(userId, items) {
    if (items.length === 0) return;
    const db = await openUserDb(userId);
    const ts = now();
    await db.withTransactionAsync(async () => {
      for (const { id, sortOrder } of items) {
        await db.runAsync(
          `UPDATE tasks SET sort_order = ?, ${TOUCH} WHERE id = ? AND sort_order != ? AND ${LIVE}`,
          sortOrder,
          ts,
          id,
          sortOrder
        );
      }
    });
    requestSync(userId);
  },

  requestSync,
  flush,

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSyncStatus: () => status,

  subscribeSyncStatus(listener) {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  },
};
