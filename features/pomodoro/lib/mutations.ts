import { encryptedColumns } from '@/core/crypto/encryptedColumns';
import { supabase } from '@/core/supabase/client';
import { mapActivePomo } from '@/features/pomodoro/lib/pomoMappers';
import type { PomoData } from '@/types';

export async function insertPomodoro(options: {
  userId: string;
  dek: Uint8Array;
  taskId: number;
  taskName: string;
  durationSec: number;
  startedAt: string;
}): Promise<PomoData> {
  const { data, error } = await supabase
    .from('pomodoros')
    .insert({
      user_id: options.userId,
      task_id: options.taskId,
      ...(await encryptedColumns(options.dek, 'task_name', options.taskName)),
      duration: options.durationSec,
      elapsed: 0,
      started_at: options.startedAt,
      paused_at: null,
      ended_at: null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapActivePomo(data);
}

export async function pausePomodoroRow(options: {
  userId: string;
  id: number;
  elapsed: number;
  pausedAt: string;
  onlyActive?: boolean;
}) {
  let query = supabase
    .from('pomodoros')
    .update({ elapsed: options.elapsed, paused_at: options.pausedAt })
    .eq('id', options.id)
    .eq('user_id', options.userId);
  if (options.onlyActive) query = query.is('ended_at', null);

  const { error } = await query;
  if (error) throw error;
}

export async function resumePomodoroRow(options: {
  userId: string;
  id: number;
  startedAt: string;
}) {
  const { error } = await supabase
    .from('pomodoros')
    .update({ paused_at: null, started_at: options.startedAt })
    .eq('id', options.id)
    .eq('user_id', options.userId);
  if (error) throw error;
}

/** Same as resumePomodoroRow, but returns the refreshed row (used after login). */
export async function resumePomodoroAndFetch(options: {
  userId: string;
  id: number;
  startedAt: string;
}): Promise<PomoData> {
  const { data, error } = await supabase
    .from('pomodoros')
    .update({ paused_at: null, started_at: options.startedAt })
    .eq('id', options.id)
    .eq('user_id', options.userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapActivePomo(data);
}

export async function endPomodoroRow(options: {
  userId: string;
  dek: Uint8Array;
  id: number;
  elapsed: number;
  endedAt: string;
  taskName: string;
}) {
  const { error } = await supabase
    .from('pomodoros')
    .update({
      elapsed: options.elapsed,
      ended_at: options.endedAt,
      paused_at: null,
      ...(await encryptedColumns(options.dek, 'task_name', options.taskName)),
    })
    .eq('id', options.id)
    .eq('user_id', options.userId);
  if (error) throw error;
}

export async function deletePomodoroRecord(userId: string, id: number) {
  const { error } = await supabase
    .from('pomodoros')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .not('ended_at', 'is', null);
  if (error) throw error;
}
