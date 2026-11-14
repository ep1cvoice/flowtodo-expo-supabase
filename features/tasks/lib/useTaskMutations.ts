import { strings } from '@/shared/lib/strings';
import { useMemo, type Dispatch, type MutableRefObject } from 'react';

import { requireDek } from '@/core/auth/requireDek';
import { taskStore } from '@/features/tasks/lib/store';
import { buildLabelLookup } from '@/features/tasks/lib/taskMappers';
import type {
  AddCategoryInput,
  AddTagInput,
  AddTaskInput,
  UpdateTaskInput,
} from '@/features/tasks/lib/types';
import type { TasksAction, TasksData } from '@/features/tasks/lib/tasksReducer';
import type { Category, Tag, Task, User } from '@/types';

/** Latest auth + data values, read at call time so the returned actions can stay stable. */
export interface TaskMutationsSnapshot {
  user: User | null;
  dek: Uint8Array | null;
  data: TasksData;
}

export interface TaskMutationsParams {
  latest: MutableRefObject<TaskMutationsSnapshot>;
  dispatch: Dispatch<TasksAction>;
}

/**
 * All returned actions are referentially stable as long as `latest` and `dispatch` are; they read the current user, DEK and task data through `latest`.
 */
export function useTaskMutations({ latest, dispatch }: TaskMutationsParams) {
  return useMemo(() => {
    const requireUserId = () => {
      const { user } = latest.current;
      if (!user) throw new Error(strings.common.notSignedIn);
      return user.id;
    };

    /**
     * Applies an optimistic change, persists it, and on failure dispatches the inverse
     * actions (then rethrows). The inverse only undoes this mutation's own effect, so
     * concurrent changes to the same slices are not overwritten.
     */
    const runOptimistic = async (
      apply: TasksAction[],
      inverse: TasksAction[],
      persist: () => Promise<void>
    ) => {
      apply.forEach(dispatch);
      try {
        await persist();
      } catch (error) {
        inverse.forEach(dispatch);
        throw error;
      }
    };

    /** Re-reads one task after a write and puts it into the state (no full refresh). */
    const syncTask = async (userId: string, id: number) => {
      const { dek, data } = latest.current;
      const task = await taskStore.fetchTaskById(
        userId,
        id,
        dek,
        buildLabelLookup(data.categories, data.tags)
      );
      if (task) dispatch({ type: 'taskUpserted', task });
    };

    const addTask = async ({
      title,
      description,
      categoryId,
      tagIds,
      scheduled = null,
    }: AddTaskInput) => {
      const userId = requireUserId();
      const activeDek = requireDek(latest.current.dek);
      const { activeTasks } = latest.current.data;
      const minSort = activeTasks.length
        ? Math.min(...activeTasks.map((t) => t.sortOrder)) - 1
        : 0;

      const id = await taskStore.insertTask({
        userId,
        dek: activeDek,
        title,
        description,
        categoryId,
        tagIds,
        scheduled: scheduled ?? null,
        sortOrder: minSort,
      });
      await syncTask(userId, id);
    };

    const updateTask = async (
      id: number,
      { title, description, categoryId, tagIds }: UpdateTaskInput
    ) => {
      const userId = requireUserId();
      const activeDek = requireDek(latest.current.dek);
      await taskStore.updateTask({
        userId,
        dek: activeDek,
        id,
        title,
        description,
        categoryId,
        tagIds,
      });
      await syncTask(userId, id);
    };

    const setTaskScheduled = async (id: number, scheduled: string | null) => {
      const userId = requireUserId();
      await taskStore.setTaskScheduled(userId, id, scheduled);
      dispatch({ type: 'tasksPatched', patches: { [id]: { scheduled } } });
    };

    const addCategory = async (input: AddCategoryInput): Promise<Category> => {
      const userId = requireUserId();
      const category = await taskStore.insertCategory(
        userId,
        requireDek(latest.current.dek),
        input
      );
      dispatch({ type: 'categoryAdded', category });
      return category;
    };

    const addTag = async (input: AddTagInput): Promise<Tag> => {
      const userId = requireUserId();
      const tag = await taskStore.insertTag(userId, requireDek(latest.current.dek), input);
      dispatch({ type: 'tagAdded', tag });
      return tag;
    };

    const allTasks = ({ activeTasks, completedTasks }: TasksData) => [
      ...activeTasks,
      ...completedTasks,
    ];

    const deleteCategory = async (id: number) => {
      const userId = requireUserId();
      const { data } = latest.current;
      const index = data.categories.findIndex((c) => c.id === id);
      const inverse: TasksAction[] = [];
      if (index >= 0) {
        inverse.push({ type: 'categoryInserted', category: data.categories[index], index });
      }
      const patches: Record<number, Partial<Task>> = {};
      for (const t of allTasks(data)) {
        if (t.categoryId === id) patches[t.id] = { categoryId: t.categoryId, category: t.category };
      }
      inverse.push({ type: 'tasksPatched', patches });

      await runOptimistic(
        [{ type: 'categoryRemoved', id }],
        inverse,
        () => taskStore.deleteCategory(userId, id)
      );
    };

    const deleteTag = async (id: number) => {
      const userId = requireUserId();
      const { data } = latest.current;
      const index = data.tags.findIndex((t) => t.id === id);
      const inverse: TasksAction[] = [];
      if (index >= 0) inverse.push({ type: 'tagInserted', tag: data.tags[index], index });
      const patches: Record<number, Partial<Task>> = {};
      for (const t of allTasks(data)) {
        if ((t.tags ?? []).some((tag) => tag.id === id)) patches[t.id] = { tags: t.tags };
      }
      inverse.push({ type: 'tasksPatched', patches });

      await runOptimistic([{ type: 'tagRemoved', id }], inverse, () =>
        taskStore.deleteTag(userId, id)
      );
    };

    const toggleTask = async (id: number) => {
      const userId = requireUserId();
      const { activeTasks, completedTasks } = latest.current.data;
      const current =
        activeTasks.find((t) => t.id === id) ?? completedTasks.find((t) => t.id === id);
      if (!current) return;

      const nextDone = !current.done;
      const nextCompletedAt = nextDone ? new Date().toISOString() : null;
      const nextTask: Task = { ...current, done: nextDone, completedAt: nextCompletedAt };

      await runOptimistic(
        [{ type: 'taskMoved', task: nextTask }],
        [{ type: 'taskMoved', task: current }],
        () => taskStore.setTaskCompletedAt(userId, id, nextCompletedAt)
      );
    };

    const deleteTask = async (id: number) => {
      const userId = requireUserId();
      const { activeTasks, completedTasks } = latest.current.data;
      const current =
        activeTasks.find((t) => t.id === id) ?? completedTasks.find((t) => t.id === id);

      await runOptimistic(
        [{ type: 'taskRemoved', id }],
        current ? [{ type: 'taskUpserted', task: current }] : [],
        () => taskStore.deleteTask(userId, id)
      );
    };

    const deleteAllActive = async () => {
      const userId = requireUserId();
      const { activeTasks } = latest.current.data;

      await runOptimistic(
        [{ type: 'allActiveCleared' }],
        activeTasks.map((task): TasksAction => ({ type: 'taskUpserted', task })),
        () => taskStore.deleteTasksByDone(userId, false)
      );
    };

    const deleteAllCompleted = async () => {
      const userId = requireUserId();
      const { completedTasks, completedCount, completedCursor, hasMoreCompleted } =
        latest.current.data;

      await runOptimistic(
        [{ type: 'allCompletedCleared' }],
        [
          {
            type: 'completedRestored',
            tasks: completedTasks,
            completedCount,
            completedCursor,
            hasMoreCompleted,
          },
        ],
        () => taskStore.deleteTasksByDone(userId, true)
      );
    };

    const reorderTasks = async (items: { id: number; sortOrder: number }[]) => {
      if (items.length === 0) return;
      const userId = requireUserId();
      const orders = Object.fromEntries(items.map((item) => [item.id, item.sortOrder]));
      const previous: Record<number, number> = {};
      for (const t of latest.current.data.activeTasks) {
        if (orders[t.id] !== undefined) previous[t.id] = t.sortOrder;
      }

      await runOptimistic(
        [{ type: 'sortOrdersApplied', orders }],
        [{ type: 'sortOrdersApplied', orders: previous }],
        () => taskStore.updateSortOrders(userId, items)
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
  }, [latest, dispatch]);
}
