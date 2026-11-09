import { strings } from '@/shared/lib/strings';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PomoData, PomoRecord } from '@/types';
import { useAuth } from '@/core/auth/AuthContext';
import { useEncryption } from '@/core/auth/EncryptionContext';
import { useTasks } from '@/features/tasks/TasksContext';
import { fetchPomodoros, MAX_HISTORY } from '@/features/pomodoro/lib/queries';
import {
  deletePomodoroRecord,
  endPomodoroRow,
  insertPomodoro,
  pausePomodoroRow,
  resumePomodoroAndFetch,
  resumePomodoroRow,
} from '@/features/pomodoro/lib/mutations';
import { registerPomodoroLogoutSnapshot } from '@/features/pomodoro/lib/pomodoroLogoutBridge';
import { requireDek } from '@/core/auth/requireDek';
import { withTimeout } from '@/shared/lib/withTimeout';
import { logger } from '@/shared/lib/logger';

const POMO_REFRESH_TIMEOUT_MS = 12_000;

interface PomodoroContextValue {
  activeTaskId: number | null;
  activePomo: PomoData | null;
  history: PomoRecord[];
  canStart: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
  startPomo: (taskId: number) => Promise<void>;
  pausePomo: () => Promise<void>;
  resumePomo: () => Promise<void>;
  endPomo: () => Promise<void>;
  deleteHistoryRecord: (id: number) => Promise<void>;
  getElapsedSeconds: (pomo?: PomoData | null) => number;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

function computeElapsedMs(pomo: PomoData, now = Date.now()): number {
  const base = Number(pomo.elapsed) || 0;
  if (pomo.pausedAt || pomo.endedAt) return base;
  const startedAt = new Date(pomo.startedAt).getTime();
  if (Number.isNaN(startedAt)) return base;
  return base + Math.max(0, now - startedAt);
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { dek } = useEncryption();
  const { tasks } = useTasks();
  const [activePomo, setActivePomo] = useState<PomoData | null>(null);
  const [history, setHistory] = useState<PomoRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTaskId = activePomo?.taskId ?? null;
  const canStart = activePomo === null;

  const activePomoRef = useRef(activePomo);
  activePomoRef.current = activePomo;

  useEffect(() => {
    if (!user) {
      return registerPomodoroLogoutSnapshot(() => null);
    }
    const userId = user.id;
    return registerPomodoroLogoutSnapshot(() => {
      const pomo = activePomoRef.current;
      if (!pomo) return null;
      return { userId, pomo };
    });
  }, [user?.id]);

  const refresh = useCallback(async (userId: string, { resumeIfPaused = false } = {}) => {
    const { active: fetched, history: fetchedHistory } = await fetchPomodoros(userId, dek);

    setHistory(fetchedHistory);

    if (!fetched) {
      setActivePomo(null);
      return;
    }

    let active = fetched;

    // After login: continue the session that was frozen on logout.
    if (resumeIfPaused && active.pausedAt && !active.endedAt) {
      try {
        active = await resumePomodoroAndFetch({
          userId,
          id: active.id,
          startedAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.warn('Failed to resume pomodoro after login:', (err as Error)?.message ?? err);
        setActivePomo(active);
        return;
      }
    }

    setActivePomo(active);
  }, [dek]);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setActivePomo(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    withTimeout(refresh(user.id, { resumeIfPaused: true }), POMO_REFRESH_TIMEOUT_MS, 'refreshPomodoro')
      .catch((err) => {
        logger.warn('Failed to load pomodoros:', err?.message ?? err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, refresh]);

  const refetch = useCallback(async () => {
    if (!user) return;
    try {
      await withTimeout(refresh(user.id), POMO_REFRESH_TIMEOUT_MS, 'refetchPomodoro');
    } catch (err) {
      logger.warn('Failed to refetch pomodoros:', (err as Error)?.message ?? err);
    }
  }, [user, refresh]);

  const getElapsedSeconds = useCallback((pomo?: PomoData | null) => {
    if (!pomo) return 0;
    return Math.floor(computeElapsedMs(pomo) / 1000);
  }, []);

  const requireUserId = () => {
    if (!user) throw new Error(strings.common.notSignedIn);
    return user.id;
  };

  const startPomo = useCallback(
    async (taskId: number) => {
      if (activePomo) return;
      const userId = requireUserId();
      const activeDek = requireDek(dek);

      const minutes = Number(user?.settings?.pomodoroTime);
      const durationSec = (Number.isFinite(minutes) && minutes > 0 ? minutes : 25) * 60;
      const taskName = tasks.find((t) => t.id === taskId)?.title ?? strings.tasks.fallbackName;
      const now = new Date().toISOString();

      const pomo = await insertPomodoro({
        userId,
        dek: activeDek,
        taskId,
        taskName,
        durationSec,
        startedAt: now,
      });
      setActivePomo(pomo);
    },
    [activePomo, tasks, user, dek]
  );

  const pausePomo = useCallback(async () => {
    if (!activePomo || activePomo.pausedAt) return;
    const userId = requireUserId();
    const elapsed = computeElapsedMs(activePomo);
    const pausedAt = new Date().toISOString();

    setActivePomo({ ...activePomo, elapsed, pausedAt });

    try {
      await pausePomodoroRow({ userId, id: activePomo.id, elapsed, pausedAt });
    } catch (err) {
      setActivePomo(activePomo);
      throw err;
    }
  }, [activePomo, user]);

  const resumePomo = useCallback(async () => {
    if (!activePomo || !activePomo.pausedAt) return;
    const userId = requireUserId();
    const startedAt = new Date().toISOString();
    const next = { ...activePomo, pausedAt: null, startedAt };

    setActivePomo(next);

    try {
      await resumePomodoroRow({ userId, id: activePomo.id, startedAt });
    } catch (err) {
      setActivePomo(activePomo);
      throw err;
    }
  }, [activePomo, user]);

  const endPomo = useCallback(async () => {
    if (!activePomo) return;
    const userId = requireUserId();
    const activeDek = requireDek(dek);

    const elapsed = computeElapsedMs(activePomo);
    const endedAt = new Date().toISOString();
    const taskName =
      tasks.find((t) => t.id === activePomo.taskId)?.title ??
      strings.pomodoro.deletedTask;

    await endPomodoroRow({
      userId,
      dek: activeDek,
      id: activePomo.id,
      elapsed,
      endedAt,
      taskName,
    });

    const record: PomoRecord = {
      id: activePomo.id,
      taskId: activePomo.taskId,
      taskName,
      startedAt: activePomo.startedAt,
      endedAt,
      elapsed,
      duration: activePomo.duration,
    };

    setHistory((h) => [record, ...h].slice(0, MAX_HISTORY));
    setActivePomo(null);
  }, [activePomo, tasks, user, dek]);

  const deleteHistoryRecord = useCallback(
    async (id: number) => {
      const userId = requireUserId();
      await deletePomodoroRecord(userId, id);
      setHistory((prev) => prev.filter((p) => p.id !== id));
    },
    [user]
  );

  const value = useMemo(
    () => ({
      activeTaskId,
      activePomo,
      history,
      canStart,
      loading,
      refetch,
      startPomo,
      pausePomo,
      resumePomo,
      endPomo,
      deleteHistoryRecord,
      getElapsedSeconds,
    }),
    [
      activeTaskId,
      activePomo,
      history,
      canStart,
      loading,
      refetch,
      startPomo,
      pausePomo,
      resumePomo,
      endPomo,
      deleteHistoryRecord,
      getElapsedSeconds,
    ]
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used within PomodoroProvider');
  return ctx;
}
