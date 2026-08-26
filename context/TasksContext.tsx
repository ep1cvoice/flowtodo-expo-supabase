import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  mergeCompletedTasks,
  type CompletedCursor,
} from '@/lib/completedPagination';
import { seedDemoData } from '@/lib/seedDemoData';
import { requireDek } from '@/lib/taskDek';
import {
  deleteCategoryForUser,
  deleteTagForUser,
  deleteTaskForUser,
  deleteTasksByDone,
  insertEncryptedCategory,
  insertEncryptedTag,
  insertEncryptedTask,
  setTaskDoneRow,
  setTaskScheduledRow,
  updateEncryptedTask,
  updateTaskSortOrders,
} from '@/lib/tasks/mutations';
import { fetchCompletedPage, fetchTasksSnapshot } from '@/lib/tasks/queries';
import type {
  AddCategoryInput,
  AddTagInput,
  AddTaskInput,
  UpdateTaskInput,
} from '@/lib/tasks/types';
import { withTimeout } from '@/lib/withTimeout';
import type { Category, Tag, Task } from '@/types';

export type { AddCategoryInput, AddTagInput, AddTaskInput, UpdateTaskInput };

const TASKS_REFRESH_TIMEOUT_MS = 15_000;

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
  const { user, loading: authLoading, dek } = useAuth();
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

        if (isEmpty) {
          await withTimeout(seedDemoData(userId), TASKS_REFRESH_TIMEOUT_MS, 'seedDemo');
          if (cancelled) return;
          await withTimeout(refresh(userId), TASKS_REFRESH_TIMEOUT_MS, 'refreshTasksAfterSeed');
        }
      } catch (err) {
        console.warn('Failed to load tasks domain:', (err as Error)?.message ?? err);
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
      console.warn('Failed to refetch tasks domain:', (err as Error)?.message ?? err);
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
      console.warn('Failed to load more completed:', (err as Error)?.message ?? err);
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

  const requireUserId = () => {
    if (!user) throw new Error('Not signed in');
    return user.id;
  };

  const addTask = async ({
    title,
    description,
    categoryId,
    tagIds,
    scheduled = null,
  }: AddTaskInput) => {
    const userId = requireUserId();
    const activeDek = requireDek(dek);
    const minSort = activeTasks.length
      ? Math.min(...activeTasks.map((t) => t.sortOrder)) - 1
      : 0;

    await insertEncryptedTask({
      userId,
      dek: activeDek,
      title,
      description,
      categoryId,
      tagIds,
      scheduled: scheduled ?? null,
      sortOrder: minSort,
    });
    await refresh(userId);
  };

  const updateTask = async (
    id: number,
    { title, description, categoryId, tagIds }: UpdateTaskInput
  ) => {
    const userId = requireUserId();
    const activeDek = requireDek(dek);
    await updateEncryptedTask({
      userId,
      dek: activeDek,
      id,
      title,
      description,
      categoryId,
      tagIds,
    });
    await refresh(userId);
  };

  const patchTaskLocal = (id: number, patch: Partial<Task>) => {
    setActiveTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setCompletedTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const setTaskScheduled = async (id: number, scheduled: string | null) => {
    const userId = requireUserId();
    await setTaskScheduledRow(userId, id, scheduled);
    patchTaskLocal(id, { scheduled });
  };

  const addCategory = async (input: AddCategoryInput): Promise<Category> => {
    const userId = requireUserId();
    const category = await insertEncryptedCategory(userId, requireDek(dek), input);
    setCategories((prev) => [...prev, category]);
    return category;
  };

  const addTag = async (input: AddTagInput): Promise<Tag> => {
    const userId = requireUserId();
    const tag = await insertEncryptedTag(userId, requireDek(dek), input);
    setTags((prev) => [...prev, tag]);
    return tag;
  };

  const deleteCategory = async (id: number) => {
    const userId = requireUserId();
    await deleteCategoryForUser(userId, id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    const clearCategory = (t: Task): Task =>
      t.categoryId === id ? { ...t, categoryId: null, category: null } : t;
    setActiveTasks((prev) => prev.map(clearCategory));
    setCompletedTasks((prev) => prev.map(clearCategory));
  };

  const deleteTag = async (id: number) => {
    const userId = requireUserId();
    await deleteTagForUser(userId, id);
    setTags((prev) => prev.filter((t) => t.id !== id));
    const stripTag = (t: Task): Task => ({
      ...t,
      tags: (t.tags ?? []).filter((tag) => tag.id !== id),
    });
    setActiveTasks((prev) => prev.map(stripTag));
    setCompletedTasks((prev) => prev.map(stripTag));
  };

  const toggleTask = async (id: number) => {
    const userId = requireUserId();
    const current =
      activeTasks.find((t) => t.id === id) ?? completedTasks.find((t) => t.id === id);
    if (!current) return;

    const nextDone = !current.done;
    const nextCompletedAt = nextDone ? new Date().toISOString() : null;
    const nextTask: Task = {
      ...current,
      done: nextDone,
      completedAt: nextCompletedAt,
    };

    if (nextDone) {
      setActiveTasks((prev) => prev.filter((t) => t.id !== id));
      setCompletedTasks((prev) => mergeCompletedTasks([nextTask], prev));
      setCompletedCount((n) => n + 1);
    } else {
      setCompletedTasks((prev) => prev.filter((t) => t.id !== id));
      setActiveTasks((prev) =>
        [...prev, nextTask].sort((a, b) => a.sortOrder - b.sortOrder)
      );
      setCompletedCount((n) => Math.max(0, n - 1));
    }

    try {
      await setTaskDoneRow(userId, id, nextDone, nextCompletedAt);
    } catch (error) {
      if (nextDone) {
        setCompletedTasks((prev) => prev.filter((t) => t.id !== id));
        setActiveTasks((prev) =>
          [...prev, current].sort((a, b) => a.sortOrder - b.sortOrder)
        );
        setCompletedCount((n) => Math.max(0, n - 1));
      } else {
        setActiveTasks((prev) => prev.filter((t) => t.id !== id));
        setCompletedTasks((prev) => mergeCompletedTasks([current], prev));
        setCompletedCount((n) => n + 1);
      }
      throw error;
    }
  };

  const deleteTask = async (id: number) => {
    const userId = requireUserId();
    const wasCompleted = completedTasks.some((t) => t.id === id);
    await deleteTaskForUser(userId, id);
    setActiveTasks((prev) => prev.filter((t) => t.id !== id));
    setCompletedTasks((prev) => prev.filter((t) => t.id !== id));
    if (wasCompleted) setCompletedCount((n) => Math.max(0, n - 1));
  };

  const deleteAllActive = async () => {
    const userId = requireUserId();
    await deleteTasksByDone(userId, false);
    setActiveTasks([]);
  };

  const deleteAllCompleted = async () => {
    const userId = requireUserId();
    await deleteTasksByDone(userId, true);
    setCompletedTasks([]);
    setCompletedCount(0);
    setCompletedCursor(null);
    setHasMoreCompleted(false);
  };

  const reorderTasks = async (items: { id: number; sortOrder: number }[]) => {
    if (items.length === 0) return;
    const userId = requireUserId();
    const previous = activeTasks;
    const orderMap = new Map(items.map((item) => [item.id, item.sortOrder]));

    setActiveTasks((current) =>
      current.map((task) =>
        orderMap.has(task.id) ? { ...task, sortOrder: orderMap.get(task.id)! } : task
      )
    );

    try {
      await updateTaskSortOrders(userId, items);
    } catch (error) {
      setActiveTasks(previous);
      throw error;
    }
  };

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
