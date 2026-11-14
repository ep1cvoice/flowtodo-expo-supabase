import type { LocalDb } from '@/core/localdb/openUserDb';
import { supabase } from '@/core/supabase/client';
import { computeElapsedMs } from '@/features/pomodoro/lib/elapsed';
import { newLocalId } from '@/features/tasks/lib/store/localId';

/**
 * Pomodoro part of the sync round (see tasks/lib/store/syncEngine.ts, which calls this).
 * Same rules as for tasks: `sync_state` + `rev`, pending local rows win over the pull.
 */

const PAGE_SIZE = 1000;
const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';
/** Raised when an upsert targets a row id owned by another user (RLS rejects the update). */
const RLS_VIOLATION = '42501';
const MAX_ATTEMPTS = 4;

export interface LocalPomodoroRow {
  id: number;
  task_id: number | null;
  task_name_enc: string | null;
  task_name_iv: string | null;
  duration: number;
  elapsed: number;
  started_at: string;
  paused_at: string | null;
  ended_at: string | null;
  paused_on_logout: number;
  created_at: string;
  sync_state: string;
  rev: number;
}

/** Timestamps are stored as canonical UTC ISO strings so they sort correctly as text. */
function normalize(value: string | null): string | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

async function purgeOrphanTaskRef(db: LocalDb, row: LocalPomodoroRow): Promise<LocalPomodoroRow> {
  if (row.task_id == null) return row;
  const task = await db.getFirstAsync(
    `SELECT id FROM tasks WHERE id = ? AND sync_state != 'deleted'`,
    row.task_id
  );
  if (task) return row;
  await db.runAsync(`UPDATE pomodoros SET task_id = NULL WHERE id = ? AND rev = ?`, row.id, row.rev);
  return { ...row, task_id: null };
}

/**
 * The server allows one unfinished session per user. A session started on this device while
 * another one was started elsewhere is finished locally (keeping its time in the history)
 * instead of being lost.
 */
async function endLocally(db: LocalDb, row: LocalPomodoroRow): Promise<LocalPomodoroRow> {
  const endedAt = row.paused_at ?? new Date().toISOString();
  const elapsed = computeElapsedMs({
    id: row.id,
    taskId: row.task_id ?? 0,
    startedAt: row.started_at,
    endedAt: null,
    duration: row.duration,
    elapsed: row.elapsed,
    pausedAt: row.paused_at,
    pausedOnLogout: false,
  });
  await db.runAsync(
    `UPDATE pomodoros SET ended_at = ?, elapsed = ?, paused_at = NULL, paused_on_logout = 0,
       sync_state = 'dirty', rev = rev + 1 WHERE id = ?`,
    endedAt,
    elapsed,
    row.id
  );
  const fresh = await db.getFirstAsync<LocalPomodoroRow>(
    `SELECT * FROM pomodoros WHERE id = ?`,
    row.id
  );
  return fresh ?? row;
}

async function reId(db: LocalDb, oldId: number): Promise<number> {
  const id = newLocalId();
  await db.runAsync(`UPDATE pomodoros SET id = ? WHERE id = ?`, id, oldId);
  return id;
}

export async function pushPomodoros(db: LocalDb, userId: string) {
  const dirty = await db.getAllAsync<LocalPomodoroRow>(
    `SELECT * FROM pomodoros WHERE sync_state = 'dirty' ORDER BY created_at`
  );
  for (const original of dirty) {
    let row = await purgeOrphanTaskRef(db, original);
    for (let attempt = 0; ; attempt++) {
      const { error } = await supabase.from('pomodoros').upsert(
        {
          id: row.id,
          user_id: userId,
          task_id: row.task_id,
          task_name_enc: row.task_name_enc,
          task_name_iv: row.task_name_iv,
          duration: row.duration,
          elapsed: row.elapsed,
          started_at: row.started_at,
          paused_at: row.paused_at,
          ended_at: row.ended_at,
          paused_on_logout: row.paused_on_logout === 1,
          created_at: row.created_at,
        },
        { onConflict: 'id' }
      );
      if (error && attempt < MAX_ATTEMPTS) {
        if (error.code === RLS_VIOLATION) {
          row = { ...row, id: await reId(db, row.id) };
          continue;
        }
        if (error.code === UNIQUE_VIOLATION && row.ended_at == null) {
          row = await endLocally(db, row);
          continue;
        }
        if (error.code === FK_VIOLATION && row.task_id != null) {
          await db.runAsync(`UPDATE pomodoros SET task_id = NULL WHERE id = ?`, row.id);
          row = { ...row, task_id: null };
          continue;
        }
      }
      if (error) throw error;
      await db.runAsync(
        `UPDATE pomodoros SET sync_state = 'synced' WHERE id = ? AND rev = ?`,
        row.id,
        row.rev
      );
      break;
    }
  }
}

export async function pushPomodoroDeletes(db: LocalDb, userId: string) {
  const deleted = await db.getAllAsync<{ id: number; rev: number }>(
    `SELECT id, rev FROM pomodoros WHERE sync_state = 'deleted'`
  );
  for (const row of deleted) {
    const { error } = await supabase
      .from('pomodoros')
      .delete()
      .eq('id', row.id)
      .eq('user_id', userId);
    if (error) throw error;
    await db.runAsync(`DELETE FROM pomodoros WHERE id = ? AND rev = ?`, row.id, row.rev);
  }
}

export interface RemotePomodoroRow {
  id: number;
  task_id: number | null;
  task_name_enc: string | null;
  task_name_iv: string | null;
  duration: number;
  elapsed: number;
  started_at: string;
  paused_at: string | null;
  ended_at: string | null;
  paused_on_logout: boolean;
  created_at: string;
}

export async function fetchRemotePomodoros(userId: string): Promise<RemotePomodoroRow[]> {
  const rows: RemotePomodoroRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('pomodoros')
      .select('*')
      .eq('user_id', userId)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as RemotePomodoroRow[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/** Mirrors the server; call inside the pull transaction. Pending local rows are kept. */
export async function applyRemotePomodoros(db: LocalDb, rows: RemotePomodoroRow[]) {
  const pending = new Set(
    (
      await db.getAllAsync<{ id: number }>(`SELECT id FROM pomodoros WHERE sync_state != 'synced'`)
    ).map((r) => r.id)
  );
  for (const p of rows) {
    if (pending.has(Number(p.id))) continue;
    await db.runAsync(
      `INSERT OR REPLACE INTO pomodoros
         (id, task_id, task_name_enc, task_name_iv, duration, elapsed, started_at, paused_at,
          ended_at, paused_on_logout, created_at, sync_state, rev)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced',
               COALESCE((SELECT rev FROM pomodoros WHERE id = ?), 0))`,
      p.id,
      p.task_id,
      p.task_name_enc,
      p.task_name_iv,
      p.duration,
      p.elapsed,
      normalize(p.started_at) ?? p.started_at,
      normalize(p.paused_at),
      normalize(p.ended_at),
      p.paused_on_logout ? 1 : 0,
      normalize(p.created_at) ?? p.created_at,
      p.id
    );
  }
  const remoteIds = new Set(rows.map((p) => Number(p.id)));
  const local = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM pomodoros WHERE sync_state = 'synced'`
  );
  for (const { id } of local) {
    if (!remoteIds.has(id)) await db.runAsync(`DELETE FROM pomodoros WHERE id = ?`, id);
  }
}
