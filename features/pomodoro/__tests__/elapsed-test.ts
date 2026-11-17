import { computeElapsedMs, countedElapsedMs } from '@/features/pomodoro/lib/elapsed';
import type { PomoData } from '@/types';

const START = '2026-01-01T10:00:00.000Z';
const startMs = new Date(START).getTime();

const pomo = (over: Partial<PomoData>) =>
  ({ elapsed: 0, startedAt: START, pausedAt: null, endedAt: null, ...over }) as unknown as PomoData;

describe('computeElapsedMs', () => {
  it('adds the running segment to the stored base', () => {
    expect(computeElapsedMs(pomo({ elapsed: 5_000 }), startMs + 3_000)).toBe(8_000);
  });

  it('returns only the base when paused or ended', () => {
    expect(computeElapsedMs(pomo({ elapsed: 5_000, pausedAt: START }), startMs + 3_000)).toBe(5_000);
    expect(computeElapsedMs(pomo({ elapsed: 5_000, endedAt: START }), startMs + 3_000)).toBe(5_000);
  });

  it('never counts negative time when the clock is before startedAt', () => {
    expect(computeElapsedMs(pomo({ elapsed: 1_000 }), startMs - 10_000)).toBe(1_000);
  });

  it('falls back to the base for an invalid startedAt or non-numeric elapsed', () => {
    expect(computeElapsedMs(pomo({ elapsed: 2_000, startedAt: 'nope' }), startMs)).toBe(2_000);
    expect(computeElapsedMs(pomo({ elapsed: undefined as unknown as number }), startMs + 1_000)).toBe(1_000);
  });
});

describe('countedElapsedMs', () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);
  const overdue: any = {
    startedAt: new Date(now - 2_000_000).toISOString(),
    endedAt: null,
    pausedAt: null,
    elapsed: 0,
    duration: 1500,
  };

  it('stops a countdown session at its planned length', () => {
    expect(countedElapsedMs(overdue, 'countdown', now)).toBe(1_500_000);
  });

  it('leaves count-up sessions and sessions still within their length alone', () => {
    expect(countedElapsedMs(overdue, 'countup', now)).toBe(2_000_000);
    expect(countedElapsedMs({ ...overdue, duration: 3600 }, 'countdown', now)).toBe(2_000_000);
  });
});
