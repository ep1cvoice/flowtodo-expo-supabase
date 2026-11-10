import type { PomoData } from '@/types';
import { pausePomodoroRow } from '@/features/pomodoro/lib/mutations';
import { logger } from '@/shared/lib/logger';
import { computeElapsedMs } from '@/features/pomodoro/lib/elapsed';

type Snapshot = { userId: string; pomo: PomoData };

let getSnapshot: (() => Snapshot | null) | null = null;

export function registerPomodoroLogoutSnapshot(fn: () => Snapshot | null) {
  getSnapshot = fn;
  return () => {
    if (getSnapshot === fn) getSnapshot = null;
  };
}

/** Freeze a running session before auth tokens are cleared. */
export async function pausePomodoroBeforeLogout() {
  const snap = getSnapshot?.();
  if (!snap) return;
  const { userId, pomo } = snap;
  if (pomo.endedAt || pomo.pausedAt) return;

  const elapsed = computeElapsedMs(pomo);
  const pausedAt = new Date().toISOString();

  try {
    await pausePomodoroRow({ userId, id: pomo.id, elapsed, pausedAt, onlyActive: true });
  } catch (err) {
    logger.warn('Failed to pause pomodoro on logout:', (err as Error)?.message ?? err);
  }
}
