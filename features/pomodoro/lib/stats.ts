export interface PomoStatsRow {
  endedAt: string;
  /** Milliseconds actually focused. */
  elapsed: number;
  /** Planned length in seconds. */
  duration: number;
}

export interface PomoPeriodStats {
  sessions: number;
  completed: number;
  focusSeconds: number;
}

export interface PomoStats {
  today: PomoPeriodStats;
  week: PomoPeriodStats;
}

/** Local midnight `daysAgo` days before `now`. */
export function startOfDay(now: Date, daysAgo = 0): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
}

function summarize(rows: PomoStatsRow[]): PomoPeriodStats {
  return {
    sessions: rows.length,
    completed: rows.filter((r) => r.elapsed >= r.duration * 1000).length,
    focusSeconds: Math.floor(rows.reduce((sum, r) => sum + Math.max(0, r.elapsed), 0) / 1000),
  };
}

/** Today and the last 7 days (today included) in the device's local time zone. */
export function computePomoStats(rows: PomoStatsRow[], now = new Date()): PomoStats {
  const todayStart = startOfDay(now).getTime();
  const weekStart = startOfDay(now, 6).getTime();
  const at = (r: PomoStatsRow) => new Date(r.endedAt).getTime();
  return {
    today: summarize(rows.filter((r) => at(r) >= todayStart)),
    week: summarize(rows.filter((r) => at(r) >= weekStart)),
  };
}

/** "1h 25m" / "25m" / "0m". */
export function formatFocusTime(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
