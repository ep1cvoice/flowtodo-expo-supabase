import type { LocalDb } from '@/core/localdb/openUserDb';
import { supabase } from '@/core/supabase/client';
import {
  applyRemotePomodoros,
  fetchRemotePomodoros,
  pushPomodoroDeletes,
  pushPomodoros,
} from '@/features/pomodoro/lib/store/pomodoroSync';
import { newLocalId } from '@/features/tasks/lib/store/localId';
import { errorMessage } from '@/shared/lib/errorMessage';
import { logger } from '@/shared/lib/logger';

/**
 * Sync between the local SQLite replica and Supabase.
 *
 * - Local rows carry `sync_state` ('synced' | 'dirty' | 'deleted') and a `rev` counter that
 *   is bumped on every local write. A push only marks a row synced if `rev` did not change
 *   while the request was in flight.
 * - Push: dirty rows are upserted (labels first, then tasks), deleted rows are deleted
 *   remotely (tasks first, then labels) and purged locally.
 * - Pull: the whole remote state is fetched (paged) and applied; rows with pending local
 *   changes are never overwritten (last write wins, a local edit beats a remote delete).
 * - Only ciphertext is handled here, so no DEK is needed.
 */

const PAGE_SIZE = 1000;
const LAST_PULL_KEY = 'last_pull_at';
const UNIQUE_VIOLATION = '23505';
/** Raised when an upsert targets a row id owned by another user (RLS rejects the update). */
const RLS_VIOLATION = '42501';

interface LabelRow {
  id: number;
  name_enc: string | null;
  name_iv: string | null;
  name_hash: string | null;
  color: string;
  icon?: string;
  created_at: string;
  sync_state: string;
  rev: number;
}

interface TaskRow {
  id: number;
  title_enc: string | null;
  title_iv: string | null;
  description_enc: string | null;
  description_iv: string | null;
  scheduled: string | null;
  completed_at: string | null;
  sort_order: number;
  category_id: number | null;
  tag_ids: string;
  created_at: string;
  sync_state: string;
  rev: number;
}

type LabelTable = 'categories' | 'tags';

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === UNIQUE_VIOLATION;
}

/** Timestamps are stored as canonical UTC ISO strings so they sort correctly as text. */
export function normalizeTimestamp(value: string | null): string | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

function isIdCollision(error: { code?: string } | null): boolean {
  return error?.code === RLS_VIOLATION || error?.code === UNIQUE_VIOLATION;
}

/** Gives a never-synced local row a fresh id and re-points everything that referenced it. */
async function reId(db: LocalDb, table: 'tasks' | LabelTable, oldId: number): Promise<number> {
  const id = newLocalId();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE ${table} SET id = ? WHERE id = ?`, id, oldId);
    if (table === 'categories') {
      await db.runAsync(
        `UPDATE tasks SET category_id = ?, sync_state = 'dirty', rev = rev + 1 WHERE category_id = ?`,
        id,
        oldId
      );
    } else if (table === 'tags') {
      const tasks = await db.getAllAsync<{ id: number; tag_ids: string }>(
        `SELECT id, tag_ids FROM tasks`
      );
      for (const task of tasks) {
        const ids = JSON.parse(task.tag_ids) as number[];
        if (!ids.includes(oldId)) continue;
        await db.runAsync(
          `UPDATE tasks SET tag_ids = ?, sync_state = 'dirty', rev = rev + 1 WHERE id = ?`,
          JSON.stringify(ids.map((t) => (t === oldId ? id : t))),
          task.id
        );
      }
    }
  });
  return id;
}

async function markSynced(db: LocalDb, table: string, id: number, rev: number) {
  await db.runAsync(`UPDATE ${table} SET sync_state = 'synced' WHERE id = ? AND rev = ?`, id, rev);
}

/**
 * Another device created a label with the same (encrypted-hash) name. Keep the remote one:
 * re-point local references to it and drop the local duplicate.
 */
async function adoptRemoteLabel(db: LocalDb, userId: string, table: LabelTable, row: LabelRow) {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .eq('name_hash', row.name_hash ?? '')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // No label with this name exists remotely, so the conflict was on the id itself.
    await reId(db, table, row.id);
    return;
  }

  const remoteId = Number(data.id);
  await db.withTransactionAsync(async () => {
    if (table === 'categories') {
      await db.runAsync(
        `UPDATE tasks SET category_id = ?, sync_state = 'dirty', rev = rev + 1 WHERE category_id = ?`,
        remoteId,
        row.id
      );
    } else {
      const tasks = await db.getAllAsync<{ id: number; tag_ids: string }>(
        `SELECT id, tag_ids FROM tasks WHERE tag_ids LIKE '%' || ? || '%'`,
        String(row.id)
      );
      for (const task of tasks) {
        const ids = (JSON.parse(task.tag_ids) as number[]).map((id) =>
          id === row.id ? remoteId : id
        );
        await db.runAsync(
          `UPDATE tasks SET tag_ids = ?, sync_state = 'dirty', rev = rev + 1 WHERE id = ?`,
          JSON.stringify([...new Set(ids)]),
          task.id
        );
      }
    }
    await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, row.id);
  });
}

async function pushLabels(db: LocalDb, userId: string, table: LabelTable) {
  const dirty = await db.getAllAsync<LabelRow>(`SELECT * FROM ${table} WHERE sync_state = 'dirty'`);
  for (const original of dirty) {
    let row = original;
    for (let attempt = 0; ; attempt++) {
      const payload = {
        id: row.id,
        user_id: userId,
        name_enc: row.name_enc,
        name_iv: row.name_iv,
        name_hash: row.name_hash,
        color: row.color,
        created_at: row.created_at,
        ...(table === 'categories' ? { icon: row.icon } : {}),
      };
      // The two tables have different column sets; the payload matches each one.
      const { error } = await supabase.from(table).upsert(payload as never, { onConflict: 'id' });
      if (error?.code === RLS_VIOLATION && attempt === 0) {
        row = { ...row, id: await reId(db, table, row.id) };
        continue;
      }
      if (isUniqueViolation(error)) {
        await adoptRemoteLabel(db, userId, table, row);
        break;
      }
      if (error) throw error;
      await markSynced(db, table, row.id, row.rev);
      break;
    }
  }
}

async function pushTasks(db: LocalDb, userId: string) {
  const dirty = await db.getAllAsync<TaskRow>(`SELECT * FROM tasks WHERE sync_state = 'dirty'`);
  for (const original of dirty) {
    let row = original;
    for (let attempt = 0; ; attempt++) {
      const { error } = await supabase.from('tasks').upsert(
        {
          id: row.id,
          user_id: userId,
          title_enc: row.title_enc,
          title_iv: row.title_iv,
          description_enc: row.description_enc,
          description_iv: row.description_iv,
          scheduled: row.scheduled,
          completed_at: row.completed_at,
          sort_order: row.sort_order,
          category_id: row.category_id,
          created_at: row.created_at,
        },
        { onConflict: 'id' }
      );
      if (isIdCollision(error) && attempt === 0) {
        row = { ...row, id: await reId(db, 'tasks', row.id) };
        continue;
      }
      if (error) throw error;

      // Replaces the task's tags atomically on the server.
      const { error: tagError } = await supabase.rpc('update_task_with_tags', {
        p_task_id: row.id,
        p_category_id: row.category_id,
        p_title_enc: row.title_enc,
        p_title_iv: row.title_iv,
        p_description_enc: row.description_enc,
        p_description_iv: row.description_iv,
        p_tag_ids: JSON.parse(row.tag_ids) as number[],
      });
      if (tagError) throw tagError;
      await markSynced(db, 'tasks', row.id, row.rev);
      break;
    }
  }
}

async function pushDeletes(db: LocalDb, userId: string, table: 'tasks' | LabelTable) {
  const deleted = await db.getAllAsync<{ id: number; rev: number }>(
    `SELECT id, rev FROM ${table} WHERE sync_state = 'deleted'`
  );
  for (const row of deleted) {
    const { error } = await supabase.from(table).delete().eq('id', row.id).eq('user_id', userId);
    if (error) throw error;
    await db.runAsync(`DELETE FROM ${table} WHERE id = ? AND rev = ?`, row.id, row.rev);
  }
}

/** Sends all pending local changes. Throws on the first network/server error. */
export async function pushPending(db: LocalDb, userId: string): Promise<void> {
  await pushDeletes(db, userId, 'tasks');
  await pushLabels(db, userId, 'categories');
  await pushLabels(db, userId, 'tags');
  await pushTasks(db, userId);
  // After the tasks they reference; before label/task deletes are irrelevant to them.
  await pushPomodoros(db, userId);
  await pushPomodoroDeletes(db, userId);
  await pushDeletes(db, userId, 'categories');
  await pushDeletes(db, userId, 'tags');
}

async function fetchAll<T>(
  load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: Error | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await load(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function removeMissing(db: LocalDb, table: string, remoteIds: Set<number>) {
  const local = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM ${table} WHERE sync_state = 'synced'`
  );
  for (const { id } of local) {
    if (!remoteIds.has(id)) await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
  }
}

/** Fetches the remote state and applies it. Returns true when local data may have changed. */
export async function pullAll(db: LocalDb, userId: string): Promise<boolean> {
  const [categories, tags, tasks, pomodoros] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from('categories').select('*').eq('user_id', userId).order('id').range(from, to)
    ),
    fetchAll((from, to) =>
      supabase.from('tags').select('*').eq('user_id', userId).order('id').range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from('tasks')
        .select('*, task_tags ( tag_id )')
        .eq('user_id', userId)
        .order('id')
        .range(from, to)
    ),
    fetchRemotePomodoros(userId),
  ]);

  await db.withTransactionAsync(async () => {
    // Pending local rows win; everything else mirrors the server.
    const pending = async (table: string) =>
      new Set(
        (
          await db.getAllAsync<{ id: number }>(
            `SELECT id FROM ${table} WHERE sync_state != 'synced'`
          )
        ).map((r) => r.id)
      );

    const pendingCategories = await pending('categories');
    for (const c of categories) {
      if (pendingCategories.has(Number(c.id))) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO categories
           (id, name_enc, name_iv, name_hash, color, icon, created_at, sync_state, rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', COALESCE((SELECT rev FROM categories WHERE id = ?), 0))`,
        c.id,
        c.name_enc,
        c.name_iv,
        c.name_hash,
        c.color,
        c.icon,
        c.created_at,
        c.id
      );
    }
    await removeMissing(db, 'categories', new Set(categories.map((c) => Number(c.id))));

    const pendingTags = await pending('tags');
    for (const t of tags) {
      if (pendingTags.has(Number(t.id))) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO tags
           (id, name_enc, name_iv, name_hash, color, created_at, sync_state, rev)
         VALUES (?, ?, ?, ?, ?, ?, 'synced', COALESCE((SELECT rev FROM tags WHERE id = ?), 0))`,
        t.id,
        t.name_enc,
        t.name_iv,
        t.name_hash,
        t.color,
        t.created_at,
        t.id
      );
    }
    await removeMissing(db, 'tags', new Set(tags.map((t) => Number(t.id))));

    const pendingTasks = await pending('tasks');
    for (const task of tasks) {
      if (pendingTasks.has(Number(task.id))) continue;
      const tagIds = ((task.task_tags ?? []) as { tag_id: number }[]).map((l) => Number(l.tag_id));
      await db.runAsync(
        `INSERT OR REPLACE INTO tasks
           (id, title_enc, title_iv, description_enc, description_iv, done, scheduled,
            completed_at, sort_order, category_id, tag_ids, created_at, updated_at, sync_state, rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced',
                 COALESCE((SELECT rev FROM tasks WHERE id = ?), 0))`,
        task.id,
        task.title_enc,
        task.title_iv,
        task.description_enc,
        task.description_iv,
        task.done ? 1 : 0,
        task.scheduled,
        normalizeTimestamp(task.completed_at),
        task.sort_order,
        task.category_id,
        JSON.stringify(tagIds),
        task.created_at,
        task.updated_at,
        task.id
      );
    }
    await removeMissing(db, 'tasks', new Set(tasks.map((t) => Number(t.id))));

    await applyRemotePomodoros(db, pomodoros);

    // Labels deleted remotely must not leave dangling references on pending local tasks.
    await db.runAsync(
      `UPDATE tasks SET category_id = NULL
       WHERE category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM categories)`
    );
    const liveTags = new Set(
      (await db.getAllAsync<{ id: number }>(`SELECT id FROM tags`)).map((r) => r.id)
    );
    const withTags = await db.getAllAsync<{ id: number; tag_ids: string }>(
      `SELECT id, tag_ids FROM tasks WHERE tag_ids != '[]'`
    );
    for (const task of withTags) {
      const ids = JSON.parse(task.tag_ids) as number[];
      const kept = ids.filter((id) => liveTags.has(id));
      if (kept.length !== ids.length) {
        await db.runAsync(
          `UPDATE tasks SET tag_ids = ? WHERE id = ?`,
          JSON.stringify(kept),
          task.id
        );
      }
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
      LAST_PULL_KEY,
      new Date().toISOString()
    );
  });
  return true;
}

export async function hasPulled(db: LocalDb): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    `SELECT value FROM meta WHERE key = ?`,
    LAST_PULL_KEY
  );
  return !!row?.value;
}

/**
 * One sync round: push local changes, then pull. A push failure does not stop the pull
 * (pending rows are protected from it) and is returned so the UI can show it; a pull
 * failure throws.
 */
export async function syncOnce(db: LocalDb, userId: string): Promise<Error | null> {
  let pushError: Error | null = null;
  try {
    await pushPending(db, userId);
  } catch (err) {
    // Offline or a server hiccup: rows stay pending and are retried on the next sync.
    logger.warn('Push failed:', errorMessage(err));
    pushError = new Error(errorMessage(err));
  }
  await pullAll(db, userId);
  return pushError;
}

/** Number of local changes that have not reached the server yet. */
export async function countPending(db: LocalDb): Promise<number> {
  let total = 0;
  for (const table of ['tasks', 'categories', 'tags', 'pomodoros']) {
    const row = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${table} WHERE sync_state != 'synced'`
    );
    total += row?.n ?? 0;
  }
  return total;
}
