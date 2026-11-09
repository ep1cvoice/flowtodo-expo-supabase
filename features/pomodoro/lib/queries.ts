import { supabase } from '@/core/supabase/client';
import { mapActivePomo, mapPomoRecord } from '@/features/pomodoro/lib/pomoMappers';
import type { PomoData, PomoRecord } from '@/types';

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
