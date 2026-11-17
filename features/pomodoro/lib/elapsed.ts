import type { PomoData } from '@/types';
import type { PomodoroMode } from '@/features/pomodoro/lib/displayTime';

/** Total elapsed milliseconds of a session: stored base plus the running segment, if any. */
export function computeElapsedMs(pomo: PomoData, now = Date.now()): number {
  const base = Number(pomo.elapsed) || 0;
  if (pomo.pausedAt || pomo.endedAt) return base;
  const startedAt = new Date(pomo.startedAt).getTime();
  if (Number.isNaN(startedAt)) return base;
  return base + Math.max(0, now - startedAt);
}

/**
 * Elapsed milliseconds that count as focus time. A countdown session is over at its planned
 * length, so time after that (e.g. the app sat in the background past the end) is not counted.
 */
export function countedElapsedMs(pomo: PomoData, mode: PomodoroMode, now = Date.now()): number {
  const elapsed = computeElapsedMs(pomo, now);
  const durationMs = (Number(pomo.duration) || 0) * 1000;
  return mode === 'countdown' && durationMs > 0 ? Math.min(elapsed, durationMs) : elapsed;
}
