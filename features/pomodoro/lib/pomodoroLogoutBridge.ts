import type { PomoData } from '@/types';
import { pomodoroStore } from '@/features/pomodoro/lib/store';
import { taskStore } from '@/features/tasks/lib/store';
import { withTimeout } from '@/shared/lib/withTimeout';
import { logger } from '@/shared/lib/logger';
import { computeElapsedMs } from '@/features/pomodoro/lib/elapsed';

/** Logging out must not hang on a bad connection. */
const LOGOUT_FLUSH_TIMEOUT_MS = 3000;

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
    await pomodoroStore.pausePomodoroRow({ userId, id: pomo.id, elapsed, pausedAt, onlyActive: true, onLogout: true });
  } catch (err) {
    logger.warn('Failed to pause pomodoro on logout:', (err as Error)?.message ?? err);
    return;
  }

  // Local-first: the pause is already saved on the device; give the server a short chance to
  // get it too so other devices see it. If that fails it syncs at the next sign-in.
  try {
    await withTimeout(taskStore.flush(userId), LOGOUT_FLUSH_TIMEOUT_MS, 'logoutFlush');
  } catch (err) {
    logger.warn('Could not sync pomodoro pause before logout:', (err as Error)?.message ?? err);
  }
}
