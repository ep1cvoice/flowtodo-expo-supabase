import { strings } from '@/shared/lib/strings';
import { decryptColumn } from '@/core/crypto/decryptColumn';
import type { PomoData, PomoRecord } from '@/types';
import type { Database } from '@/types/database';

type PomoRow = Database['public']['Tables']['pomodoros']['Row'];

const DELETED_TASK_NAME = strings.pomodoro.deletedTask;

/**
 * Rows with no stored name at all (ciphertext and IV both NULL) get the placeholder.
 * Anything else must decrypt — a failure throws DecryptionError instead of being masked.
 */
function resolveTaskName(dek: Uint8Array | null, row: PomoRow): string {
  if (row.task_name_enc == null && row.task_name_iv == null) return DELETED_TASK_NAME;
  return decryptColumn(dek, row.task_name_enc, row.task_name_iv, {
    table: 'pomodoros',
    id: row.id,
    column: 'task_name',
  });
}

// mapActivePomo does not expose task_name, so no DEK is needed here
export function mapActivePomo(row: PomoRow): PomoData {
  return {
    id: Number(row.id),
    taskId: row.task_id != null ? Number(row.task_id) : 0,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    duration: Number(row.duration),
    elapsed: Number(row.elapsed),
    pausedAt: row.paused_at,
  };
}

export function mapPomoRecord(row: PomoRow, dek: Uint8Array | null): PomoRecord {
  return {
    id: Number(row.id),
    taskId: row.task_id != null ? Number(row.task_id) : 0,
    taskName: resolveTaskName(dek, row),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    elapsed: Number(row.elapsed),
    duration: Number(row.duration),
  };
}
