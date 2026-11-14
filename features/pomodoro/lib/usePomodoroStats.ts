import { useEffect, useState } from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { usePomodoroState } from '@/features/pomodoro/PomodoroContext';
import { pomodoroStore } from '@/features/pomodoro/lib/store';
import { computePomoStats, startOfDay, type PomoStats } from '@/features/pomodoro/lib/stats';
import { logger } from '@/shared/lib/logger';

/** Today / last-7-days totals; reloads whenever a session is finished or deleted. */
export function usePomodoroStats(): PomoStats | null {
  const { user } = useAuth();
  const { history } = usePomodoroState();
  const [loaded, setLoaded] = useState<{ userId: string; stats: PomoStats } | null>(null);
  const userId = user?.id;
  // Changes when a session is added to or removed from the history.
  const historyKey = history.map((h) => h.id).join(',');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const now = new Date();
    pomodoroStore.fetchStatsRows(userId, startOfDay(now, 6).toISOString())
      .then((rows) => {
        if (!cancelled) setLoaded({ userId, stats: computePomoStats(rows, now) });
      })
      .catch((err) => {
        logger.warn('Failed to load pomodoro stats:', err?.message ?? err);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, historyKey]);

  // Stats of a previous account are never shown.
  return loaded && loaded.userId === userId ? loaded.stats : null;
}
