import type { PomoData, PomoRecord } from '@/types';
import type { Database } from '@/types/database';

type PomoRow = Database['public']['Tables']['pomodoros']['Row'];

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

export function mapPomoRecord(row: PomoRow): PomoRecord {
  return {
    id: Number(row.id),
    taskId: row.task_id != null ? Number(row.task_id) : 0,
    taskName: row.task_name || 'Deleted task',
    startedAt: row.started_at,
    endedAt: row.ended_at,
    elapsed: Number(row.elapsed),
    duration: Number(row.duration),
  };
}
