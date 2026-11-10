import {
  mergeCompletedTasks,
  type CompletedCursor,
} from '@/features/tasks/lib/completedPagination';
import type { Category, Tag, Task } from '@/types';

export interface TasksData {
  activeTasks: Task[];
  completedTasks: Task[];
  completedCount: number;
  completedCursor: CompletedCursor | null;
  hasMoreCompleted: boolean;
  categories: Category[];
  tags: Tag[];
}

export const initialTasksData: TasksData = {
  activeTasks: [],
  completedTasks: [],
  completedCount: 0,
  completedCursor: null,
  hasMoreCompleted: false,
  categories: [],
  tags: [],
};

export type TasksAction =
  | { type: 'reset' }
  | {
      type: 'snapshotLoaded';
      snapshot: {
        categories: Category[];
        tags: Tag[];
        activeTasks: Task[];
        completedTasks: Task[];
        completedCount: number;
        nextCursor: CompletedCursor | null;
        hasMore: boolean;
      };
    }
  | {
      type: 'completedPageLoaded';
      page: Task[];
      nextCursor: CompletedCursor | null;
      hasMore: boolean;
    }
  /** Shallow-patches tasks by id (active and completed). Also used as an inverse action. */
  | { type: 'tasksPatched'; patches: Record<number, Partial<Task>> }
  | { type: 'categoryAdded'; category: Category }
  | { type: 'tagAdded'; tag: Tag }
  /** Removes the category and clears it from every task that used it. */
  | { type: 'categoryRemoved'; id: number }
  /** Inverse of categoryRemoved for the list itself (tasks are restored via tasksPatched). */
  | { type: 'categoryInserted'; category: Category; index: number }
  /** Removes the tag and strips it from every task that used it. */
  | { type: 'tagRemoved'; id: number }
  | { type: 'tagInserted'; tag: Tag; index: number }
  /** Moves the task into the active/completed bucket matching `task.done`. */
  | { type: 'taskMoved'; task: Task }
  /** Replaces the task in place if it is already loaded, otherwise inserts it. */
  | { type: 'taskUpserted'; task: Task }
  | { type: 'taskRemoved'; id: number }
  | { type: 'allActiveCleared' }
  | { type: 'allCompletedCleared' }
  /** Inverse of allCompletedCleared: puts the removed completed tasks and paging info back. */
  | {
      type: 'completedRestored';
      tasks: Task[];
      completedCount: number;
      completedCursor: CompletedCursor | null;
      hasMoreCompleted: boolean;
    }
  | { type: 'sortOrdersApplied'; orders: Record<number, number> };

function patchTasks(tasks: Task[], patches: Record<number, Partial<Task>>): Task[] {
  return tasks.map((t) => (patches[t.id] ? { ...t, ...patches[t.id] } : t));
}

function insertAt<T>(list: T[], item: T, index: number): T[] {
  const at = Math.min(Math.max(index, 0), list.length);
  return [...list.slice(0, at), item, ...list.slice(at)];
}

export function tasksReducer(state: TasksData, action: TasksAction): TasksData {
  switch (action.type) {
    case 'reset':
      return initialTasksData;

    case 'snapshotLoaded': {
      const { snapshot } = action;
      return {
        categories: snapshot.categories,
        tags: snapshot.tags,
        activeTasks: snapshot.activeTasks,
        completedTasks: snapshot.completedTasks,
        completedCount: snapshot.completedCount,
        completedCursor: snapshot.nextCursor,
        hasMoreCompleted: snapshot.hasMore,
      };
    }

    case 'completedPageLoaded':
      return {
        ...state,
        completedTasks: mergeCompletedTasks(state.completedTasks, action.page),
        completedCursor: action.nextCursor,
        hasMoreCompleted: action.hasMore,
      };

    case 'tasksPatched':
      return {
        ...state,
        activeTasks: patchTasks(state.activeTasks, action.patches),
        completedTasks: patchTasks(state.completedTasks, action.patches),
      };

    case 'categoryAdded':
      return { ...state, categories: [...state.categories, action.category] };

    case 'tagAdded':
      return { ...state, tags: [...state.tags, action.tag] };

    case 'categoryRemoved': {
      const clear = (t: Task): Task =>
        t.categoryId === action.id ? { ...t, categoryId: null, category: null } : t;
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        activeTasks: state.activeTasks.map(clear),
        completedTasks: state.completedTasks.map(clear),
      };
    }

    case 'categoryInserted':
      if (state.categories.some((c) => c.id === action.category.id)) return state;
      return {
        ...state,
        categories: insertAt(state.categories, action.category, action.index),
      };

    case 'tagRemoved': {
      const strip = (t: Task): Task => ({
        ...t,
        tags: (t.tags ?? []).filter((tag) => tag.id !== action.id),
      });
      return {
        ...state,
        tags: state.tags.filter((t) => t.id !== action.id),
        activeTasks: state.activeTasks.map(strip),
        completedTasks: state.completedTasks.map(strip),
      };
    }

    case 'tagInserted':
      if (state.tags.some((t) => t.id === action.tag.id)) return state;
      return { ...state, tags: insertAt(state.tags, action.tag, action.index) };

    case 'taskMoved': {
      const { task } = action;
      const wasCompleted = state.completedTasks.some((t) => t.id === task.id);
      const active = state.activeTasks.filter((t) => t.id !== task.id);
      const completed = state.completedTasks.filter((t) => t.id !== task.id);
      if (task.done) {
        return {
          ...state,
          activeTasks: active,
          completedTasks: mergeCompletedTasks([task], completed),
          completedCount: wasCompleted ? state.completedCount : state.completedCount + 1,
        };
      }
      return {
        ...state,
        activeTasks: [...active, task].sort((a, b) => a.sortOrder - b.sortOrder),
        completedTasks: completed,
        completedCount: wasCompleted
          ? Math.max(0, state.completedCount - 1)
          : state.completedCount,
      };
    }

    case 'taskUpserted': {
      const { task } = action;
      const loaded =
        state.activeTasks.some((t) => t.id === task.id) ||
        state.completedTasks.some((t) => t.id === task.id);
      if (!loaded) return tasksReducer(state, { type: 'taskMoved', task });
      const replace = (list: Task[]) => list.map((t) => (t.id === task.id ? task : t));
      return {
        ...state,
        activeTasks: replace(state.activeTasks),
        completedTasks: replace(state.completedTasks),
      };
    }

    case 'taskRemoved': {
      const wasCompleted = state.completedTasks.some((t) => t.id === action.id);
      return {
        ...state,
        activeTasks: state.activeTasks.filter((t) => t.id !== action.id),
        completedTasks: state.completedTasks.filter((t) => t.id !== action.id),
        completedCount: wasCompleted
          ? Math.max(0, state.completedCount - 1)
          : state.completedCount,
      };
    }

    case 'allActiveCleared':
      return { ...state, activeTasks: [] };

    case 'allCompletedCleared':
      return {
        ...state,
        completedTasks: [],
        completedCount: 0,
        completedCursor: null,
        hasMoreCompleted: false,
      };

    case 'completedRestored':
      return {
        ...state,
        completedTasks: mergeCompletedTasks(state.completedTasks, action.tasks),
        completedCount: action.completedCount,
        completedCursor: action.completedCursor,
        hasMoreCompleted: action.hasMoreCompleted,
      };

    case 'sortOrdersApplied':
      return {
        ...state,
        activeTasks: state.activeTasks.map((t) =>
          action.orders[t.id] !== undefined ? { ...t, sortOrder: action.orders[t.id] } : t
        ),
      };

    default:
      return state;
  }
}
