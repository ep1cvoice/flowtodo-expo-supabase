import { strings } from '@/shared/lib/strings';
import type { Dispatch, SetStateAction } from 'react';

import { requireDek } from '@/core/auth/requireDek';
import {
  mergeCompletedTasks,
  type CompletedCursor,
} from '@/features/tasks/lib/completedPagination';
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
} from '@/features/tasks/lib/mutations';
import type {
  AddCategoryInput,
  AddTagInput,
  AddTaskInput,
  UpdateTaskInput,
} from '@/features/tasks/lib/types';
import type { Category, Tag, Task, User } from '@/types';

type OptimisticSlice =
  | 'activeTasks'
  | 'completedTasks'
  | 'completedCount'
  | 'categories'
  | 'tags';

type Setter<T> = Dispatch<SetStateAction<T>>;

export interface TaskMutationsParams {
  user: User | null;
  dek: Uint8Array | null;
  activeTasks: Task[];
  completedTasks: Task[];
  completedCount: number;
  categories: Category[];
  tags: Tag[];
  refresh: (userId: string) => Promise<unknown>;
  setActiveTasks: Setter<Task[]>;
  setCompletedTasks: Setter<Task[]>;
  setCompletedCount: Setter<number>;
  setCompletedCursor: Setter<CompletedCursor | null>;
  setHasMoreCompleted: Setter<boolean>;
  setCategories: Setter<Category[]>;
  setTags: Setter<Tag[]>;
}

export function useTaskMutations({
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
}: TaskMutationsParams) {
  const requireUserId = () => {
    if (!user) throw new Error(strings.common.notSignedIn);
    return user.id;
  };

  /**
   * Applies an optimistic state change, persists it, and restores the previous
   * values of the given state slices if persisting fails (then rethrows).
   */
  const runOptimistic = async (
    slices: OptimisticSlice[],
    apply: () => void,
    persist: () => Promise<void>
  ) => {
    const snapshot: Record<OptimisticSlice, () => void> = {
      activeTasks: ((v) => () => setActiveTasks(v))(activeTasks),
      completedTasks: ((v) => () => setCompletedTasks(v))(completedTasks),
      completedCount: ((v) => () => setCompletedCount(v))(completedCount),
      categories: ((v) => () => setCategories(v))(categories),
      tags: ((v) => () => setTags(v))(tags),
    };
    apply();
    try {
      await persist();
    } catch (error) {
      slices.forEach((slice) => snapshot[slice]());
      throw error;
    }
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
    await runOptimistic(
      ['categories', 'activeTasks', 'completedTasks'],
      () => {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        const clearCategory = (t: Task): Task =>
          t.categoryId === id ? { ...t, categoryId: null, category: null } : t;
        setActiveTasks((prev) => prev.map(clearCategory));
        setCompletedTasks((prev) => prev.map(clearCategory));
      },
      () => deleteCategoryForUser(userId, id)
    );
  };

  const deleteTag = async (id: number) => {
    const userId = requireUserId();
    await runOptimistic(
      ['tags', 'activeTasks', 'completedTasks'],
      () => {
        setTags((prev) => prev.filter((t) => t.id !== id));
        const stripTag = (t: Task): Task => ({
          ...t,
          tags: (t.tags ?? []).filter((tag) => tag.id !== id),
        });
        setActiveTasks((prev) => prev.map(stripTag));
        setCompletedTasks((prev) => prev.map(stripTag));
      },
      () => deleteTagForUser(userId, id)
    );
  };

  const toggleTask = async (id: number) => {
    const userId = requireUserId();
    const current =
      activeTasks.find((t) => t.id === id) ?? completedTasks.find((t) => t.id === id);
    if (!current) return;

    const nextDone = !current.done;
    const nextCompletedAt = nextDone ? new Date().toISOString() : null;
    const nextTask: Task = { ...current, done: nextDone, completedAt: nextCompletedAt };

    await runOptimistic(
      ['activeTasks', 'completedTasks', 'completedCount'],
      () => {
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
      },
      () => setTaskDoneRow(userId, id, nextDone, nextCompletedAt)
    );
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
    const orderMap = new Map(items.map((item) => [item.id, item.sortOrder]));

    await runOptimistic(
      ['activeTasks'],
      () =>
        setActiveTasks((current) =>
          current.map((task) =>
            orderMap.has(task.id) ? { ...task, sortOrder: orderMap.get(task.id)! } : task
          )
        ),
      () => updateTaskSortOrders(userId, items)
    );
  };

  return {
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
  };
}
