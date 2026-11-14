import { openUserDb, type LocalDb } from '@/core/localdb/openUserDb';
import { encryptedColumns } from '@/core/crypto/encryptedColumns';
import { mapActivePomo, mapPomoRecord } from '@/features/pomodoro/lib/pomoMappers';
import { MAX_HISTORY } from '@/features/pomodoro/lib/queries';
import {
  pullAll,
  hasPulled,
} from '@/features/tasks/lib/store/syncEngine';
import { localTaskStore } from '@/features/tasks/lib/store/localStore';
import { newLocalId } from '@/features/tasks/lib/store/localId';
import type { LocalPomodoroRow } from '@/features/pomodoro/lib/store/pomodoroSync';
import type { PomodoroStore } from '@/features/pomodoro/lib/store/types';
import { errorMessage } from '@/shared/lib/errorMessage';
import { logger } from '@/shared/lib/logger';
import type { Database } from '@/types/database';

type PomoRow = Database['public']['Tables']['pomodoros']['Row'];

const LIVE = `sync_state != 'deleted'`;
const TOUCH = `sync_state = 'dirty', rev = rev + 1`;

function toRow(userId: string, row: LocalPomodoroRow): PomoRow {
  return {
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
  };
}

/** A new device has nothing local yet; an offline first start simply shows an empty state. */
async function ensureInitialPull(db: LocalDb, userId: string) {
  if (await hasPulled(db)) return;
  try {
    await pullAll(db, userId);
  } catch (err) {
    logger.warn('Initial pomodoro pull failed:', errorMessage(err));
  }
}

const sync = (userId: string) => localTaskStore.requestSync(userId);

/** Local SQLite replica; changes reach Supabase through the shared background sync. */
export const localPomodoroStore: PomodoroStore = {
  async fetchPomodoros(userId, dek) {
    const db = await openUserDb(userId);
    await ensureInitialPull(db, userId);
    const active = await db.getFirstAsync<LocalPomodoroRow>(
      `SELECT * FROM pomodoros WHERE ${LIVE} AND ended_at IS NULL LIMIT 1`
    );
    const history = await db.getAllAsync<LocalPomodoroRow>(
      `SELECT * FROM pomodoros WHERE ${LIVE} AND ended_at IS NOT NULL
       ORDER BY ended_at DESC LIMIT ?`,
      MAX_HISTORY
    );
    return {
      active: active ? mapActivePomo(toRow(userId, active)) : null,
      history: history.map((row) => mapPomoRecord(toRow(userId, row), dek)),
    };
  },

  async fetchStatsRows(userId, sinceIso) {
    const db = await openUserDb(userId);
    const rows = await db.getAllAsync<LocalPomodoroRow>(
      `SELECT * FROM pomodoros WHERE ${LIVE} AND ended_at IS NOT NULL AND ended_at >= ?`,
      sinceIso
    );
    return rows.map((row) => ({
      endedAt: row.ended_at as string,
      elapsed: Number(row.elapsed),
      duration: Number(row.duration),
    }));
  },

  async insertPomodoro(o) {
    const db = await openUserDb(o.userId);
    const enc = await encryptedColumns(o.dek, 'task_name', o.taskName);
    const id = o.id ?? newLocalId();
    await db.runAsync(
      `INSERT INTO pomodoros (id, task_id, task_name_enc, task_name_iv, duration, elapsed,
         started_at, paused_at, ended_at, paused_on_logout, created_at, sync_state, rev)
       VALUES (?, ?, ?, ?, ?, 0, ?, NULL, NULL, 0, ?, 'dirty', 1)`,
      id,
      o.taskId,
      enc.task_name_enc,
      enc.task_name_iv,
      o.durationSec,
      o.startedAt,
      o.startedAt
    );
    const row = await db.getFirstAsync<LocalPomodoroRow>(`SELECT * FROM pomodoros WHERE id = ?`, id);
    sync(o.userId);
    return mapActivePomo(toRow(o.userId, row as LocalPomodoroRow));
  },

  async pausePomodoroRow(o) {
    const db = await openUserDb(o.userId);
    await db.runAsync(
      `UPDATE pomodoros SET elapsed = ?, paused_at = ?, paused_on_logout = ?, ${TOUCH}
       WHERE id = ? AND ${LIVE}${o.onlyActive ? ' AND ended_at IS NULL' : ''}`,
      o.elapsed,
      o.pausedAt,
      o.onLogout ? 1 : 0,
      o.id
    );
    sync(o.userId);
  },

  async resumePomodoroRow(o) {
    const db = await openUserDb(o.userId);
    await db.runAsync(
      `UPDATE pomodoros SET paused_at = NULL, paused_on_logout = 0, started_at = ?, ${TOUCH}
       WHERE id = ? AND ${LIVE}`,
      o.startedAt,
      o.id
    );
    sync(o.userId);
  },

  async resumePomodoroAndFetch(o) {
    await localPomodoroStore.resumePomodoroRow(o);
    const db = await openUserDb(o.userId);
    const row = await db.getFirstAsync<LocalPomodoroRow>(
      `SELECT * FROM pomodoros WHERE id = ? AND ${LIVE}`,
      o.id
    );
    if (!row) throw new Error('Pomodoro not found');
    return mapActivePomo(toRow(o.userId, row));
  },

  async endPomodoroRow(o) {
    const db = await openUserDb(o.userId);
    const enc = await encryptedColumns(o.dek, 'task_name', o.taskName);
    await db.runAsync(
      `UPDATE pomodoros SET elapsed = ?, ended_at = ?, paused_at = NULL, paused_on_logout = 0,
         task_name_enc = ?, task_name_iv = ?, ${TOUCH}
       WHERE id = ? AND ${LIVE}`,
      o.elapsed,
      o.endedAt,
      enc.task_name_enc,
      enc.task_name_iv,
      o.id
    );
    sync(o.userId);
  },

  async deletePomodoroRecord(userId, id) {
    const db = await openUserDb(userId);
    await db.runAsync(
      `UPDATE pomodoros SET sync_state = 'deleted', rev = rev + 1
       WHERE id = ? AND ${LIVE} AND ended_at IS NOT NULL`,
      id
    );
    sync(userId);
  },
};
