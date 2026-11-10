import { TASKS_REFRESH_TIMEOUT_MS } from '@/shared/constants/timing';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { useEncryption } from '@/core/auth/EncryptionContext';
import { seedDemoData } from '@/features/tasks/lib/seedDemoData';
import { initialTasksData, tasksReducer } from '@/features/tasks/lib/tasksReducer';
import {
  useTaskMutations,
  type TaskMutationsSnapshot,
} from '@/features/tasks/lib/useTaskMutations';
import { fetchCompletedPage, fetchTasksSnapshot } from '@/features/tasks/lib/queries';
import type {
  AddCategoryInput,
  AddTagInput,
  AddTaskInput,
  TaskFormInput,
  UpdateTaskInput,
} from '@/features/tasks/lib/types';
import { withTimeout } from '@/shared/lib/withTimeout';
import type { Category, Tag, Task } from '@/types';
import { logger } from '@/shared/lib/logger';

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
  /** Why the last (re)load failed; null while loading or after a successful load. */
  error: Error | null;
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

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { dek } = useEncryption();
  const [data, dispatch] = useReducer(tasksReducer, initialTasksData);
  const [loadingMoreCompleted, setLoadingMoreCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { activeTasks, completedTasks } = data;
  const tasks = useMemo(
    () => [...activeTasks, ...completedTasks],
    [activeTasks, completedTasks]
  );

  // Actions read the latest user/DEK/data through this ref so they can stay referentially stable.
  const latest = useRef<TaskMutationsSnapshot>({ user, dek, data });
  latest.current = { user, dek, data };
  const loadingMoreRef = useRef(false);

  // Only the response of the newest refresh may touch state; see `refresh`.
  const requestIdRef = useRef(0);

  /**
   * Fetches and applies a snapshot. Late responses are dropped: a response is applied only if
   * no newer refresh started, it did not time out (when `timeoutLabel` is given), and the
   * signed-in user is still the one it was requested for.
   */
  const refresh = useCallback(async (userId: string, timeoutLabel?: string) => {
    const requestId = ++requestIdRef.current;
    const request = fetchTasksSnapshot(userId, latest.current.dek).then((snapshot) => {
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

  /** Loads the snapshot (seeding demo data into an empty account) and tracks loading/error. */
  const loadTasks = useCallback(
    async (userId: string, isCurrent: () => boolean) => {
      setLoading(true);
      setError(null);
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
          await withTimeout(seedDemoData(userId, activeDek), TASKS_REFRESH_TIMEOUT_MS, 'seedDemo');
          if (!isCurrent()) return;
          await refresh(userId, 'refreshTasksAfterSeed');
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

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      requestIdRef.current++;
      dispatch({ type: 'reset' });
      setError(null);
      setLoading(false);
      return;
    }

    // Rows cannot be decrypted without the DEK (on login `user` is set before it, and a
    // locked session has none), so wait for it; this effect re-runs once it is available.
    if (!dek) {
      setLoading(true);
      return;
    }

    void loadTasks(user.id, () => !cancelled);

    return () => {
      cancelled = true;
    };
    // `dek` is a dependency on purpose: refresh reads it through a ref, and the list
    // is fetched (and decrypted) once the DEK becomes available.
  }, [user?.id, authLoading, dek, loadTasks]);

  const retry = useCallback(async () => {
    const { user: currentUser, dek: currentDek } = latest.current;
    if (!currentUser || !currentDek) return;
    const userId = currentUser.id;
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
      // Not surfaced as `error`: a failed background refetch must not hide a loaded list.
      logger.warn('Failed to refetch tasks domain:', (err as Error)?.message ?? err);
    }
  }, [refresh]);

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
      const { page, hasMore, nextCursor } = await fetchCompletedPage(
        currentUser.id,
        current.completedCursor,
        currentDek
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
  } = useTaskMutations({ latest, dispatch, refresh });

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
