import type { PomoData } from '@/types';
import { supabase } from '@/supabase/client';

type Snapshot = { userId: string; pomo: PomoData };

let getSnapshot: (() => Snapshot | null) | null = null;

export function registerPomodoroLogoutSnapshot(fn: () => Snapshot | null) {
  getSnapshot = fn;
  return () => {
    if (getSnapshot === fn) getSnapshot = null;
  };
}

function computeElapsedMs(pomo: PomoData, now = Date.now()): number {
  const base = Number(pomo.elapsed) || 0;
  if (pomo.pausedAt || pomo.endedAt) return base;
  const startedAt = new Date(pomo.startedAt).getTime();
  if (Number.isNaN(startedAt)) return base;
  return base + Math.max(0, now - startedAt);
}

/** Freeze a running session before auth tokens are cleared. */
export async function pausePomodoroBeforeLogout() {
  const snap = getSnapshot?.();
  if (!snap) return;
  const { userId, pomo } = snap;
  if (pomo.endedAt || pomo.pausedAt) return;

  const elapsed = computeElapsedMs(pomo);
  const pausedAt = new Date().toISOString();

  const { error } = await supabase
    .from('pomodoros')
    .update({ elapsed, paused_at: pausedAt })
    .eq('id', pomo.id)
    .eq('user_id', userId)
    .is('ended_at', null);

  if (error) {
    console.warn('Failed to pause pomodoro on logout:', error.message);
  }
}
