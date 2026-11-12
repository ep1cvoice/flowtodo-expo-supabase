import { supabase } from '@/core/supabase/client';
import { mapActivePomo, mapPomoRecord } from '@/features/pomodoro/lib/pomoMappers';
import type { PomoData, PomoRecord } from '@/types';
import type { PomoStatsRow } from '@/features/pomodoro/lib/stats';

export const MAX_HISTORY = 5;

export async function fetchPomodoros(
  userId: string,
  dek: Uint8Array | null
): Promise<{ active: PomoData | null; history: PomoRecord[] }> {
  const [activeRes, historyRes] = await Promise.all([
    supabase
      .from('pomodoros')
      .select('*')
      .eq('user_id', userId)
      .is('ended_at', null)
      .maybeSingle(),
    supabase
      .from('pomodoros')
      .select('*')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(MAX_HISTORY),
  ]);

  if (activeRes.error) throw activeRes.error;
  if (historyRes.error) throw historyRes.error;

  return {
    active: activeRes.data ? mapActivePomo(activeRes.data) : null,
    history: (historyRes.data ?? []).map((row) => mapPomoRecord(row, dek)),
  };
}

/** Finished sessions since `sinceIso`; only unencrypted columns, so no DEK is needed. */
export async function fetchPomodoroStatsRows(
  userId: string,
  sinceIso: string
): Promise<PomoStatsRow[]> {
  const { data, error } = await supabase
    .from('pomodoros')
    .select('ended_at, elapsed, duration')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('ended_at', sinceIso);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    endedAt: row.ended_at as string,
    elapsed: Number(row.elapsed),
    duration: Number(row.duration),
  }));
}
