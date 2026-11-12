import { useEffect, useState } from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { usePomodoroState } from '@/features/pomodoro/PomodoroContext';
import { fetchPomodoroStatsRows } from '@/features/pomodoro/lib/queries';
import { computePomoStats, startOfDay, type PomoStats } from '@/features/pomodoro/lib/stats';
import { logger } from '@/shared/lib/logger';

/** Today / last-7-days totals; reloads whenever a session is finished or deleted. */
export function usePomodoroStats(): PomoStats | null {
  const { user } = useAuth();
  const { history } = usePomodoroState();
  const [stats, setStats] = useState<PomoStats | null>(null);
  const userId = user?.id;
  // Changes when a session is added to or removed from the history.
  const historyKey = history.map((h) => h.id).join(',');

  useEffect(() => {
    if (!userId) {
      setStats(null);
      return;
    }
    let cancelled = false;
    const now = new Date();
    fetchPomodoroStatsRows(userId, startOfDay(now, 6).toISOString())
      .then((rows) => {
        if (!cancelled) setStats(computePomoStats(rows, now));
      })
      .catch((err) => {
        logger.warn('Failed to load pomodoro stats:', err?.message ?? err);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, historyKey]);

  return stats;
}
