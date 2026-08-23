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
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TasksContext';
import { mapActivePomo, mapPomoRecord } from '@/lib/pomoMappers';
import { registerPomodoroLogoutSnapshot } from '@/lib/pomodoroLogoutBridge';
import { encryptField } from '@/lib/crypto';
import { requireDek } from '@/lib/taskDek';
import { withTimeout } from '@/lib/withTimeout';
import { supabase } from '@/supabase/client';

const MAX_HISTORY = 5;
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
  const { user, dek } = useAuth();
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
    const [activeRes, historyRes] = await Promise.all([
      supabase
        .from('pomodoros')
        .select('*')
        .eq('user_id', userId)
        .is('ended_at', null)
        .maybeSingle(),
      supabase
        .from('pomodoros')
        .select('*')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(MAX_HISTORY),
    ]);

    if (activeRes.error) throw activeRes.error;
    if (historyRes.error) throw historyRes.error;

    setHistory((historyRes.data ?? []).map((row) => mapPomoRecord(row, dek)));

    if (!activeRes.data) {
      setActivePomo(null);
      return;
    }

    let active = mapActivePomo(activeRes.data);

    // After login: continue the session that was frozen on logout.
    if (resumeIfPaused && active.pausedAt && !active.endedAt) {
      const startedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('pomodoros')
        .update({ paused_at: null, started_at: startedAt })
        .eq('id', active.id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        console.warn('Failed to resume pomodoro after login:', error.message);
        setActivePomo(active);
        return;
      }
      active = mapActivePomo(data);
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
        console.warn('Failed to load pomodoros:', err?.message ?? err);
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
      console.warn('Failed to refetch pomodoros:', (err as Error)?.message ?? err);
    }
  }, [user, refresh]);

  const getElapsedSeconds = useCallback((pomo?: PomoData | null) => {
    if (!pomo) return 0;
    return Math.floor(computeElapsedMs(pomo) / 1000);
  }, []);

  const requireUserId = () => {
    if (!user) throw new Error('Not signed in');
    return user.id;
  };

  const startPomo = useCallback(
    async (taskId: number) => {
      if (activePomo) return;
      const userId = requireUserId();
      const activeDek = requireDek(dek);

      const minutes = Number(user?.settings?.pomodoroTime);
      const durationSec = (Number.isFinite(minutes) && minutes > 0 ? minutes : 25) * 60;
      const taskName = tasks.find((t) => t.id === taskId)?.title ?? 'Task';
      const now = new Date().toISOString();

      const taskNameEnc = await encryptField(activeDek, taskName);

      const { data, error } = await supabase
        .from('pomodoros')
        .insert({
          user_id: userId,
          task_id: taskId,
          task_name: '', // plaintext no longer written — real value in task_name_enc
          task_name_enc: taskNameEnc.ciphertext,
          task_name_iv: taskNameEnc.iv,
          duration: durationSec,
          elapsed: 0,
          started_at: now,
          paused_at: null,
          ended_at: null,
        })
        .select('*')
        .single();

      if (error) throw error;
      setActivePomo(mapActivePomo(data));
    },
    [activePomo, tasks, user, dek]
  );

  const pausePomo = useCallback(async () => {
    if (!activePomo || activePomo.pausedAt) return;
    const userId = requireUserId();
    const elapsed = computeElapsedMs(activePomo);
    const pausedAt = new Date().toISOString();

    setActivePomo({ ...activePomo, elapsed, pausedAt });

    const { error } = await supabase
      .from('pomodoros')
      .update({ elapsed, paused_at: pausedAt })
      .eq('id', activePomo.id)
      .eq('user_id', userId);

    if (error) {
      setActivePomo(activePomo);
      throw error;
    }
  }, [activePomo, user]);

  const resumePomo = useCallback(async () => {
    if (!activePomo || !activePomo.pausedAt) return;
    const userId = requireUserId();
    const startedAt = new Date().toISOString();
    const next = { ...activePomo, pausedAt: null, startedAt };

    setActivePomo(next);

    const { error } = await supabase
      .from('pomodoros')
      .update({ paused_at: null, started_at: startedAt })
      .eq('id', activePomo.id)
      .eq('user_id', userId);

    if (error) {
      setActivePomo(activePomo);
      throw error;
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
      'Deleted task';

    const taskNameEnc = await encryptField(activeDek, taskName);

    const { error } = await supabase
      .from('pomodoros')
      .update({
        elapsed,
        ended_at: endedAt,
        paused_at: null,
        task_name: '', // plaintext no longer written — real value in task_name_enc
        task_name_enc: taskNameEnc.ciphertext,
        task_name_iv: taskNameEnc.iv,
      })
      .eq('id', activePomo.id)
      .eq('user_id', userId);

    if (error) throw error;

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
      const { error } = await supabase
        .from('pomodoros')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .not('ended_at', 'is', null);

      if (error) throw error;
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
