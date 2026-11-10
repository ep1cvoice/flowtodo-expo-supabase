import type { PomoData } from '@/types';

/** Total elapsed milliseconds of a session: stored base plus the running segment, if any. */
export function computeElapsedMs(pomo: PomoData, now = Date.now()): number {
  const base = Number(pomo.elapsed) || 0;
  if (pomo.pausedAt || pomo.endedAt) return base;
  const startedAt = new Date(pomo.startedAt).getTime();
  if (Number.isNaN(startedAt)) return base;
  return base + Math.max(0, now - startedAt);
}
