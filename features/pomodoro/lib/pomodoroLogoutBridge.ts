import type { PomoData } from '@/types';
import { pausePomodoroRow } from '@/features/pomodoro/lib/mutations';

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

  try {
    await pausePomodoroRow({ userId, id: pomo.id, elapsed, pausedAt, onlyActive: true });
  } catch (err) {
    console.warn('Failed to pause pomodoro on logout:', (err as Error)?.message ?? err);
  }
}
