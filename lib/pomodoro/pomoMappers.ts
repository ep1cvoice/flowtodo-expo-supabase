import { decryptField } from '@/lib/crypto';
import type { PomoData, PomoRecord } from '@/types';
import type { Database } from '@/types/database';

type PomoRow = Database['public']['Tables']['pomodoros']['Row'];

function resolveTaskName(dek: Uint8Array | null, row: PomoRow, fallback: string): string {
  if (dek && row.task_name_enc && row.task_name_iv) {
    try {
      return decryptField(dek, row.task_name_enc, row.task_name_iv);
    } catch (err) {
      console.warn('Failed to decrypt task_name, falling back:', err);
      return fallback;
    }
  }
  return fallback;
}

// mapActivePomo nie zwraca task_name — bez zmian w treści, dek nie jest tu potrzebny
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
    taskName: resolveTaskName(dek, row, row.task_name || 'Deleted task'),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    elapsed: Number(row.elapsed),
    duration: Number(row.duration),
  };
}
