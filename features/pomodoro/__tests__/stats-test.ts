import { computePomoStats, formatFocusTime } from '@/features/pomodoro/lib/stats';

const now = new Date(2026, 10, 12, 15, 0, 0); // local time, Thu 12 Nov 2026
const row = (d: Date, elapsedSec: number, durationSec = 1500) => ({
  endedAt: d.toISOString(),
  elapsed: elapsedSec * 1000,
  duration: durationSec,
});

describe('computePomoStats', () => {
  it('splits sessions into today and the last 7 days', () => {
    const stats = computePomoStats(
      [
        row(new Date(2026, 10, 12, 9, 0), 1500), // today, completed
        row(new Date(2026, 10, 12, 11, 0), 600), // today, stopped
        row(new Date(2026, 10, 6, 10, 0), 1500), // 6 days ago: in the week
        row(new Date(2026, 10, 5, 23, 59), 1500), // 7 days ago: out
      ],
      now
    );
    expect(stats.today).toEqual({ sessions: 2, completed: 1, focusSeconds: 2100 });
    expect(stats.week).toEqual({ sessions: 3, completed: 2, focusSeconds: 3600 });
  });

  it('returns zeros for no sessions', () => {
    const zero = { sessions: 0, completed: 0, focusSeconds: 0 };
    expect(computePomoStats([], now)).toEqual({ today: zero, week: zero });
  });
});

describe('formatFocusTime', () => {
  it('formats minutes and hours', () => {
    expect(formatFocusTime(0)).toBe('0m');
    expect(formatFocusTime(1500)).toBe('25m');
    expect(formatFocusTime(5100)).toBe('1h 25m');
  });
});
