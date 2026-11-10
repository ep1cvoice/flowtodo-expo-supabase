import { TASKS_REFRESH_TIMEOUT_MS } from '@/shared/constants/timing';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { useEncryption } from '@/core/auth/EncryptionContext';
import {
  mergeCompletedTasks,
  type CompletedCursor,
} from '@/features/tasks/lib/completedPagination';
import { seedDemoData } from '@/features/tasks/lib/seedDemoData';
import { useTaskMutations } from '@/features/tasks/lib/useTaskMutations';
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

interface TasksContextValue {
  tasks: Task[];
  activeTasks: Task[];
  completedTasks: Task[];
  completedCount: number;
  hasMoreCompleted: boolean;
  loadingMoreCompleted: boolean;
  categories: Category[];
  tags: Tag[];
  loading: boolean;
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

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { dek } = useEncryption();
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [completedCursor, setCompletedCursor] = useState<CompletedCursor | null>(null);
  const [hasMoreCompleted, setHasMoreCompleted] = useState(false);
  const [loadingMoreCompleted, setLoadingMoreCompleted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const tasks = useMemo(
    () => [...activeTasks, ...completedTasks],
    [activeTasks, completedTasks]
  );

  const refresh = useCallback(
    async (userId: string) => {
      const snapshot = await fetchTasksSnapshot(userId, dek);
      setCategories(snapshot.categories);
      setTags(snapshot.tags);
      setActiveTasks(snapshot.activeTasks);
      setCompletedTasks(snapshot.completedTasks);
      setCompletedCount(snapshot.completedCount);
      setCompletedCursor(snapshot.nextCursor);
      setHasMoreCompleted(snapshot.hasMore);
      return snapshot;
    },
    [dek]
  );

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setActiveTasks([]);
      setCompletedTasks([]);
      setCompletedCount(0);
      setCompletedCursor(null);
      setHasMoreCompleted(false);
      setCategories([]);
      setTags([]);
      setLoading(false);
      return;
    }

    const userId = user.id;
    setLoading(true);

    (async () => {
      try {
        const snapshot = await withTimeout(
          refresh(userId),
          TASKS_REFRESH_TIMEOUT_MS,
          'refreshTasks'
        );
        if (cancelled) return;

        const isEmpty =
          snapshot.categories.length === 0 &&
          snapshot.tags.length === 0 &&
          snapshot.activeTasks.length === 0 &&
          snapshot.completedTasks.length === 0;

        // Seeding needs the DEK; when it is not available yet the effect re-runs once it is.
        if (isEmpty && dek) {
          await withTimeout(seedDemoData(userId, dek), TASKS_REFRESH_TIMEOUT_MS, 'seedDemo');
          if (cancelled) return;
          await withTimeout(refresh(userId), TASKS_REFRESH_TIMEOUT_MS, 'refreshTasksAfterSeed');
        }
      } catch (err) {
        logger.warn('Failed to load tasks domain:', (err as Error)?.message ?? err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, refresh]);

  const refetch = useCallback(async () => {
    if (!user) return;
    try {
      await withTimeout(refresh(user.id), TASKS_REFRESH_TIMEOUT_MS, 'refetchTasks');
    } catch (err) {
      logger.warn('Failed to refetch tasks domain:', (err as Error)?.message ?? err);
    }
  }, [user, refresh]);

  const loadMoreCompleted = useCallback(async () => {
    if (!user || !hasMoreCompleted || loadingMoreCompleted || !completedCursor) return;

    setLoadingMoreCompleted(true);
    try {
      const { page, hasMore, nextCursor } = await fetchCompletedPage(
        user.id,
        completedCursor,
        dek
      );
      setCompletedTasks((prev) => mergeCompletedTasks(prev, page));
      setCompletedCursor(nextCursor);
      setHasMoreCompleted(hasMore);
    } catch (err) {
      logger.warn('Failed to load more completed:', (err as Error)?.message ?? err);
      throw err;
    } finally {
      setLoadingMoreCompleted(false);
    }
  }, [
    user,
    hasMoreCompleted,
    loadingMoreCompleted,
    completedCursor,
    dek,
  ]);

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
  } = useTaskMutations({
    user,
    dek,
    activeTasks,
    completedTasks,
    completedCount,
    categories,
    tags,
    refresh,
    setActiveTasks,
    setCompletedTasks,
    setCompletedCount,
    setCompletedCursor,
    setHasMoreCompleted,
    setCategories,
    setTags,
  });

  return (
    <TasksContext.Provider
      value={{
        tasks,
        activeTasks,
        completedTasks,
        completedCount,
        hasMoreCompleted,
        loadingMoreCompleted,
        categories,
        tags,
        loading,
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
      }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
