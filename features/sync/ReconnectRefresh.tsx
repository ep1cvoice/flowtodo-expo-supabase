import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/core/auth/AuthContext';
import { useTasksActions } from '@/features/tasks/TasksContext';
import { taskStore } from '@/features/tasks/lib/store';
import { supabase } from '@/core/supabase/client';
import { usePomodoroActions } from '@/features/pomodoro/PomodoroContext';
import { useOnReconnect } from '@/shared/providers/NetworkContext';

export default function ReconnectRefresh() {
  const { user } = useAuth();
  const { refetch: refetchTasks } = useTasksActions();
  const { refetch: refetchPomodoro } = usePomodoroActions();
  const userId = user?.id;

  useOnReconnect(() => {
    // Local-first: push pending changes and pull; the tasks context re-reads afterwards.
    if (taskStore.localFirst && userId) taskStore.requestSync(userId);
    else void refetchTasks();
    void refetchPomodoro();
  });

  // Coming back to the foreground is the other natural moment to sync.
  useEffect(() => {
    if (!taskStore.localFirst || !userId) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') taskStore.requestSync(userId);
    });
    return () => subscription.remove();
  }, [userId]);

  // A (re)created or refreshed Supabase session (e.g. after working offline on an expired
  // token) is the moment pending local changes can finally be pushed.
  useEffect(() => {
    if (!taskStore.localFirst || !userId) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED') return;
      // Never call into supabase-js from inside this callback (deadlock risk): defer.
      setTimeout(() => taskStore.requestSync(userId), 0);
    });
    return () => subscription.unsubscribe();
  }, [userId]);

  return null;
}
