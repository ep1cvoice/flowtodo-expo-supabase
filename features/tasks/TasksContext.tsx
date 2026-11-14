import { TASKS_REFRESH_TIMEOUT_MS } from '@/shared/constants/timing';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { useEncryption } from '@/core/auth/EncryptionContext';
import { initialTasksData, tasksReducer, type TasksData } from '@/features/tasks/lib/tasksReducer';
import {
  useTaskMutations,
  type TaskMutationsSnapshot,
} from '@/features/tasks/lib/useTaskMutations';
import { buildLabelLookup } from '@/features/tasks/lib/taskMappers';
import { taskStore } from '@/features/tasks/lib/store';
import type {
  AddCategoryInput,
  AddTagInput,
  AddTaskInput,
  UpdateTaskInput,
} from '@/features/tasks/lib/types';
import { withTimeout } from '@/shared/lib/withTimeout';
import type { Category, Tag, Task } from '@/types';
import { logger } from '@/shared/lib/logger';
import { toastForError } from '@/shared/lib/networkError';
import { strings } from '@/shared/lib/strings';
import { useToast } from '@/shared/providers/ToastContext';

interface TasksState {
  tasks: Task[];
  activeTasks: Task[];
  completedTasks: Task[];
  completedCount: number;
  hasMoreCompleted: boolean;
  loadingMoreCompleted: boolean;
  categories: Category[];
  tags: Tag[];
  loading: boolean;
  /** Why the last (re)load or refetch failed; null while loading or after a success. */
  error: Error | null;
  /** Whether there is anything to show; screens use the error view only when there isn't. */
  hasData: boolean;
}

interface TasksActions {
  /** Reloads everything after a failed load, showing the loading state again. */
  retry: () => Promise<void>;
  refetch: () => Promise<void>;
  loadMoreCompleted: () => Promise<void>;
  addTask: (input: AddTaskInput) => Promise<void>;
  updateTask: (id: number, input: UpdateTaskInput) => Promise<void>;
  setTaskScheduled: (id: number, scheduled: string | null) => Promise<void>;
  addCategory: (input: AddCategoryInput) => Promise<Category>;
  addTag: (input: AddTagInput) => Promise<Tag>;
  deleteCategory: (id: number) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  deleteAllActive: () => Promise<void>;
  deleteAllCompleted: () => Promise<void>;
  reorderTasks: (items: { id: number; sortOrder: number }[]) => Promise<void>;
}

const TasksStateContext = createContext<TasksState | null>(null);
const TasksActionsContext = createContext<TasksActions | null>(null);

function hasAnyData(d: TasksData): boolean {
  return (
    d.activeTasks.length > 0 ||
    d.completedTasks.length > 0 ||
    d.categories.length > 0 ||
    d.tags.length > 0
  );
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { dek } = useEncryption();
  const { showToast } = useToast();
  const [data, dispatch] = useReducer(tasksReducer, initialTasksData);
  const [loadingMoreCompleted, setLoadingMoreCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { activeTasks, completedTasks } = data;
  const tasks = useMemo(() => [...activeTasks, ...completedTasks], [activeTasks, completedTasks]);

  // Actions read the latest user/DEK/data through this ref so they can stay referentially stable.
  const latest = useRef<TaskMutationsSnapshot>({ user, dek, data });
  const loadingMoreRef = useRef(false);
  const showToastRef = useRef(showToast);
  // Synced after render, before any effect or event handler can read them.
  useLayoutEffect(() => {
    latest.current = { user, dek, data };
    showToastRef.current = showToast;
  });

  // Only the response of the newest refresh may touch state; see `refresh`.
  const requestIdRef = useRef(0);

  /**
   * Fetches and applies a snapshot. Late responses are dropped: a response is applied only if
   * no newer refresh started, it did not time out (when `timeoutLabel` is given), and the
   * signed-in user is still the one it was requested for.
   */
  const refresh = useCallback(async (userId: string, timeoutLabel?: string) => {
    const requestId = ++requestIdRef.current;
    const request = taskStore.fetchTasksSnapshot(userId, latest.current.dek).then((snapshot) => {
      if (requestId === requestIdRef.current && latest.current.user?.id === userId) {
        dispatch({ type: 'snapshotLoaded', snapshot });
      }
      return snapshot;
    });
    if (!timeoutLabel) return request;
    try {
      return await withTimeout(request, TASKS_REFRESH_TIMEOUT_MS, timeoutLabel);
    } catch (err) {
      // Whatever the timed-out request returns later must not overwrite newer state.
      if (requestId === requestIdRef.current) requestIdRef.current++;
      throw err;
    }
  }, []);

  /**
   * Loads the snapshot (seeding demo data into an empty account) and tracks loading/error.
   * Callers set `loading` (and clear `error`) before calling it.
   */
  const loadTasks = useCallback(
    async (userId: string, isCurrent: () => boolean) => {
      try {
        const snapshot = await refresh(userId, 'refreshTasks');
        if (!isCurrent()) return;

        const isEmpty =
          snapshot.categories.length === 0 &&
          snapshot.tags.length === 0 &&
          snapshot.activeTasks.length === 0 &&
          snapshot.completedTasks.length === 0;

        const activeDek = latest.current.dek;
        if (isEmpty && activeDek) {
          const seeded = await withTimeout(
            taskStore.seedDemoData(userId, activeDek),
            TASKS_REFRESH_TIMEOUT_MS,
            'seedDemo'
          );
          if (!isCurrent()) return;
          // Not seeded = the account was seeded before and the user emptied it on purpose.
          if (seeded) await refresh(userId, 'refreshTasksAfterSeed');
        }
      } catch (err) {
        logger.warn('Failed to load tasks domain:', (err as Error)?.message ?? err);
        if (isCurrent()) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [refresh]
  );

  // Adjust state while rendering when the session changes (instead of in the effect below,
  // which would render the stale state first).
  const sessionUserId = user?.id ?? null;
  const sessionKey = { authLoading, userId: sessionUserId, dek };
  const [prevSession, setPrevSession] = useState<typeof sessionKey | null>(null);
  if (
    !prevSession ||
    prevSession.authLoading !== sessionKey.authLoading ||
    prevSession.userId !== sessionKey.userId ||
    prevSession.dek !== sessionKey.dek
  ) {
    setPrevSession(sessionKey);
    if (!authLoading && !user) {
      dispatch({ type: 'reset' });
      setError(null);
      setLoading(false);
    } else {
      // Waiting for auth or for the DEK (rows cannot be decrypted without it: on login
      // `user` is set before it, and a locked session has none), or about to load.
      setLoading(true);
      if (!authLoading && dek) setError(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;

    if (!sessionUserId) {
      // Responses still in flight for the previous user must not touch state.
      requestIdRef.current++;
      return;
    }

    // This effect re-runs once the DEK is available.
    if (!dek) return;

    // loadTasks only sets state after its first await, so nothing renders synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTasks(sessionUserId, () => !cancelled);

    return () => {
      cancelled = true;
    };
    // `dek` is a dependency on purpose: refresh reads it through a ref, and the list
    // is fetched (and decrypted) once the DEK becomes available.
  }, [sessionUserId, authLoading, dek, loadTasks]);

  const retry = useCallback(async () => {
    const { user: currentUser, dek: currentDek } = latest.current;
    if (!currentUser || !currentDek) return;
    const userId = currentUser.id;
    setLoading(true);
    setError(null);
    await loadTasks(userId, () => latest.current.user?.id === userId);
  }, [loadTasks]);

  const refetch = useCallback(async () => {
    const { user: currentUser } = latest.current;
    if (!currentUser) return;
    try {
      await refresh(currentUser.id, 'refetchTasks');
      // E.g. the reconnect refetch succeeding after the initial load failed offline.
      setError(null);
    } catch (err) {
      logger.warn('Failed to refetch tasks domain:', (err as Error)?.message ?? err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // With data on screen the list stays (screens show the error view only when there is
      // nothing to show), so tell the user the refresh itself failed.
      const { data: current } = latest.current;
      if (hasAnyData(current)) {
        showToastRef.current(toastForError(err, strings.common.refreshFailed), 'error');
      }
    }
  }, [refresh]);

  // Local-first stores sync in the background: kick one off whenever data is loaded, and
  // re-read the local replica whenever a sync changed it. No-ops for the online-only store.
  const userId = user?.id;
  useEffect(() => {
    if (!userId || !dek || !taskStore.localFirst) return;
    taskStore.requestSync(userId);
    return taskStore.subscribe(() => {
      if (latest.current.user?.id !== userId) return;
      void refresh(userId).catch((err) =>
        logger.warn('Failed to re-read after sync:', (err as Error)?.message ?? err)
      );
    });
  }, [userId, dek, refresh]);

  const loadMoreCompleted = useCallback(async () => {
    const { user: currentUser, dek: currentDek, data: current } = latest.current;
    if (
      !currentUser ||
      !current.hasMoreCompleted ||
      loadingMoreRef.current ||
      !current.completedCursor
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMoreCompleted(true);
    try {
      const { page, hasMore, nextCursor } = await taskStore.fetchCompletedPage(
        currentUser.id,
        current.completedCursor,
        currentDek,
        buildLabelLookup(current.categories, current.tags)
      );
      dispatch({ type: 'completedPageLoaded', page, nextCursor, hasMore });
    } catch (err) {
      logger.warn('Failed to load more completed:', (err as Error)?.message ?? err);
      throw err;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMoreCompleted(false);
    }
  }, []);

  const {
    addTask,
    updateTask,
    setTaskScheduled,
    addCategory,
    addTag,
    deleteCategory,
    deleteTag,
    toggleTask,
    deleteTask,
    deleteAllActive,
    deleteAllCompleted,
    reorderTasks,
  } = useTaskMutations({ latest, dispatch });

  const { completedCount, hasMoreCompleted, categories, tags } = data;

  const state = useMemo<TasksState>(
    () => ({
      tasks,
      activeTasks,
      completedTasks,
      completedCount,
      hasMoreCompleted,
      loadingMoreCompleted,
      categories,
      tags,
      loading,
      error,
      hasData: hasAnyData(data),
    }),
    [
      tasks,
      activeTasks,
      completedTasks,
      completedCount,
      hasMoreCompleted,
      loadingMoreCompleted,
      categories,
      tags,
      loading,
      error,
      data,
    ]
  );

  const actions = useMemo<TasksActions>(
    () => ({
      retry,
      refetch,
      loadMoreCompleted,
      addTask,
      updateTask,
      setTaskScheduled,
      addCategory,
      addTag,
      deleteCategory,
      deleteTag,
      toggleTask,
      deleteTask,
      deleteAllActive,
      deleteAllCompleted,
      reorderTasks,
    }),
    [
      retry,
      refetch,
      loadMoreCompleted,
      addTask,
      updateTask,
      setTaskScheduled,
      addCategory,
      addTag,
      deleteCategory,
      deleteTag,
      toggleTask,
      deleteTask,
      deleteAllActive,
      deleteAllCompleted,
      reorderTasks,
    ]
  );

  return (
    <TasksActionsContext.Provider value={actions}>
      <TasksStateContext.Provider value={state}>{children}</TasksStateContext.Provider>
    </TasksActionsContext.Provider>
  );
}

/** Task data only; re-renders whenever the data changes. */
export function useTasksState(): TasksState {
  const ctx = useContext(TasksStateContext);
  if (!ctx) throw new Error('useTasksState must be used within TasksProvider');
  return ctx;
}

/** Actions only; components using this do not re-render on data changes. */
export function useTasksActions(): TasksActions {
  const ctx = useContext(TasksActionsContext);
  if (!ctx) throw new Error('useTasksActions must be used within TasksProvider');
  return ctx;
}
