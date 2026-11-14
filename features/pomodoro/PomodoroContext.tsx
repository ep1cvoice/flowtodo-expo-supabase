import { POMO_REFRESH_TIMEOUT_MS } from '@/shared/constants/timing';
import { strings } from '@/shared/lib/strings';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PomoData, PomoRecord } from '@/types';
import { computeElapsedMs } from '@/features/pomodoro/lib/elapsed';
import { useAuth } from '@/core/auth/AuthContext';
import { useEncryption } from '@/core/auth/EncryptionContext';
import { taskStore } from '@/features/tasks/lib/store';
import { MAX_HISTORY } from '@/features/pomodoro/lib/queries';
import { pomodoroStore } from '@/features/pomodoro/lib/store';
import { registerPomodoroLogoutSnapshot } from '@/features/pomodoro/lib/pomodoroLogoutBridge';
import { requireDek } from '@/core/auth/requireDek';
import { withTimeout } from '@/shared/lib/withTimeout';
import { logger } from '@/shared/lib/logger';


interface PomodoroState {
  activeTaskId: number | null;
  activePomo: PomoData | null;
  history: PomoRecord[];
  canStart: boolean;
  loading: boolean;
}

/** Referentially stable for the provider's lifetime — never causes re-renders. */
interface PomodoroActions {
  refetch: () => Promise<void>;
  /** `task.title` is stored (encrypted) with the session as its name. */
  startPomo: (task: { id: number; title: string }) => Promise<void>;
  pausePomo: () => Promise<void>;
  resumePomo: () => Promise<void>;
  /** `taskTitle` names the history record; omit it when the task no longer exists. */
  endPomo: (taskTitle?: string) => Promise<void>;
  deleteHistoryRecord: (id: number) => Promise<void>;
  getElapsedSeconds: (pomo?: PomoData | null) => number;
}

const PomodoroStateContext = createContext<PomodoroState | null>(null);
const PomodoroActionsContext = createContext<PomodoroActions | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { dek } = useEncryption();
  const [activePomo, setActivePomo] = useState<PomoData | null>(null);
  const [history, setHistory] = useState<PomoRecord[]>([]);
  // The (user, dek) pair the last initial load finished for; loading is derived from it.
  const [loadedFor, setLoadedFor] = useState<{ userId: string; dek: Uint8Array } | null>(null);
  const userId = user?.id ?? null;

  // Another account must never see the previous one's session: reset while rendering.
  const [ownerId, setOwnerId] = useState(userId);
  if (ownerId !== userId) {
    setOwnerId(userId);
    setActivePomo(null);
    setHistory([]);
  }
  // Titles are encrypted, so nothing can be read before the DEK is available.
  const loading =
    userId !== null && (!dek || loadedFor?.userId !== userId || loadedFor.dek !== dek);

  const activeTaskId = activePomo?.taskId ?? null;
  const canStart = activePomo === null;

  // Actions read the latest values through this ref so they can stay referentially stable.
  const latest = useRef({ user, dek, activePomo });
  const activePomoRef = useRef(activePomo);
  // Refs are synced after render (before any effect or event handler can read them).
  useLayoutEffect(() => {
    latest.current = { user, dek, activePomo };
    activePomoRef.current = activePomo;
  });

  useEffect(() => {
    if (!userId) {
      return registerPomodoroLogoutSnapshot(() => null);
    }
    return registerPomodoroLogoutSnapshot(() => {
      const pomo = activePomoRef.current;
      if (!pomo) return null;
      return { userId, pomo };
    });
  }, [userId]);

  const refresh = useCallback(async (userId: string, { resumeIfPaused = false } = {}) => {
    const { active: fetched, history: fetchedHistory } = await pomodoroStore.fetchPomodoros(
      userId,
      latest.current.dek
    );

    setHistory(fetchedHistory);

    if (!fetched) {
      setActivePomo(null);
      return;
    }

    let active = fetched;

    // After login: continue the session that was frozen on logout. Sessions paused by hand
    // (`pausedOnLogout` false) stay paused, wherever and whenever the app is opened.
    if (resumeIfPaused && active.pausedOnLogout && active.pausedAt && !active.endedAt) {
      try {
        active = await pomodoroStore.resumePomodoroAndFetch({
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
  }, []);

  useEffect(() => {
    // Nothing to load without a user, or before the DEK is available (this effect re-runs
    // once it is).
    if (!userId || !dek) return;

    let cancelled = false;
    withTimeout(refresh(userId, { resumeIfPaused: true }), POMO_REFRESH_TIMEOUT_MS, 'refreshPomodoro')
      .catch((err) => {
        logger.warn('Failed to load pomodoros:', err?.message ?? err);
      })
      .finally(() => {
        if (!cancelled) setLoadedFor({ userId, dek });
      });

    return () => {
      cancelled = true;
    };
  }, [userId, dek, refresh]);

  // A sync round may bring sessions from other devices (or this one's first pull).
  useEffect(() => {
    if (!userId || !dek) return;
    return taskStore.subscribe(() => {
      withTimeout(refresh(userId), POMO_REFRESH_TIMEOUT_MS, 'syncRefreshPomodoro').catch((err) => {
        logger.warn('Failed to refresh pomodoros after sync:', err?.message ?? err);
      });
    });
  }, [userId, dek, refresh]);

  const actions = useMemo<PomodoroActions>(() => {
    const requireUserId = () => {
      const { user: currentUser } = latest.current;
      if (!currentUser) throw new Error(strings.common.notSignedIn);
      return currentUser.id;
    };

    return {
      refetch: async () => {
        const { user: currentUser } = latest.current;
        if (!currentUser) return;
        try {
          await withTimeout(refresh(currentUser.id), POMO_REFRESH_TIMEOUT_MS, 'refetchPomodoro');
        } catch (err) {
          logger.warn('Failed to refetch pomodoros:', (err as Error)?.message ?? err);
        }
      },

      getElapsedSeconds: (pomo) => {
        if (!pomo) return 0;
        return Math.floor(computeElapsedMs(pomo) / 1000);
      },

      startPomo: async (task) => {
        if (latest.current.activePomo) return;
        const userId = requireUserId();
        const activeDek = requireDek(latest.current.dek);

        const minutes = Number(latest.current.user?.settings?.pomodoroTime);
        const durationSec = (Number.isFinite(minutes) && minutes > 0 ? minutes : 25) * 60;
        const taskName = task.title;
        const now = new Date().toISOString();

        const pomo = await pomodoroStore.insertPomodoro({
          userId,
          dek: activeDek,
          taskId: task.id,
          taskName,
          durationSec,
          startedAt: now,
        });
        setActivePomo(pomo);
      },

      pausePomo: async () => {
        const current = latest.current.activePomo;
        if (!current || current.pausedAt) return;
        const userId = requireUserId();
        const elapsed = computeElapsedMs(current);
        const pausedAt = new Date().toISOString();

        setActivePomo({ ...current, elapsed, pausedAt });

        try {
          await pomodoroStore.pausePomodoroRow({ userId, id: current.id, elapsed, pausedAt });
        } catch (err) {
          setActivePomo(current);
          throw err;
        }
      },

      resumePomo: async () => {
        const current = latest.current.activePomo;
        if (!current || !current.pausedAt) return;
        const userId = requireUserId();
        const startedAt = new Date().toISOString();

        setActivePomo({ ...current, pausedAt: null, startedAt });

        try {
          await pomodoroStore.resumePomodoroRow({ userId, id: current.id, startedAt });
        } catch (err) {
          setActivePomo(current);
          throw err;
        }
      },

      endPomo: async (taskTitle) => {
        const current = latest.current.activePomo;
        if (!current) return;
        const userId = requireUserId();
        const activeDek = requireDek(latest.current.dek);

        const elapsed = computeElapsedMs(current);
        const endedAt = new Date().toISOString();
        const taskName = taskTitle ?? strings.pomodoro.deletedTask;

        await pomodoroStore.endPomodoroRow({
          userId,
          dek: activeDek,
          id: current.id,
          elapsed,
          endedAt,
          taskName,
        });

        const record: PomoRecord = {
          id: current.id,
          taskId: current.taskId,
          taskName,
          startedAt: current.startedAt,
          endedAt,
          elapsed,
          duration: current.duration,
        };

        setHistory((h) => [record, ...h].slice(0, MAX_HISTORY));
        setActivePomo(null);
      },

      deleteHistoryRecord: async (id) => {
        const userId = requireUserId();
        await pomodoroStore.deletePomodoroRecord(userId, id);
        setHistory((prev) => prev.filter((p) => p.id !== id));
      },
    };
  }, [refresh]);

  const state = useMemo<PomodoroState>(
    () => ({ activeTaskId, activePomo, history, canStart, loading }),
    [activeTaskId, activePomo, history, canStart, loading]
  );

  return (
    <PomodoroActionsContext.Provider value={actions}>
      <PomodoroStateContext.Provider value={state}>{children}</PomodoroStateContext.Provider>
    </PomodoroActionsContext.Provider>
  );
}

/** Session data only; re-renders whenever the session or history changes. */
export function usePomodoroState(): PomodoroState {
  const ctx = useContext(PomodoroStateContext);
  if (!ctx) throw new Error('usePomodoroState must be used within PomodoroProvider');
  return ctx;
}

/** Actions only; components using this do not re-render on session changes. */
export function usePomodoroActions(): PomodoroActions {
  const ctx = useContext(PomodoroActionsContext);
  if (!ctx) throw new Error('usePomodoroActions must be used within PomodoroProvider');
  return ctx;
}
