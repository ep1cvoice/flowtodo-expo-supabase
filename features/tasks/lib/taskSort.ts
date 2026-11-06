import type { Task } from '@/types';

export type TaskSortMode = 'manual' | 'due' | 'created' | 'title';

export const TASK_SORT_MODES: readonly TaskSortMode[] = [
  'manual',
  'due',
  'created',
  'title',
] as const;

export const TASK_SORT_LABELS: Record<TaskSortMode, string> = {
  manual: 'Manual',
  due: 'Due date',
  created: 'Created',
  title: 'Title',
};

export const TASK_SORT_HINTS: Record<TaskSortMode, string> = {
  manual: 'Drag to reorder',
  due: 'Soonest first · no date last',
  created: 'Newest first',
  title: 'A–Z',
};

export function isTaskSortMode(value: unknown): value is TaskSortMode {
  return typeof value === 'string' && (TASK_SORT_MODES as readonly string[]).includes(value);
}

function compareNullableDateAsc(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Stable tie-break via sortOrder, then id. */
export function compareTasksBySort(a: Task, b: Task, mode: TaskSortMode): number {
  let primary = 0;
  switch (mode) {
    case 'due':
      primary = compareNullableDateAsc(a.scheduled, b.scheduled);
      break;
    case 'created':
      if (a.created > b.created) primary = -1;
      else if (a.created < b.created) primary = 1;
      break;
    case 'title':
      primary = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      break;
    case 'manual':
    default:
      primary = a.sortOrder - b.sortOrder;
      break;
  }
  if (primary !== 0) return primary;
  if (mode !== 'manual') {
    const byOrder = a.sortOrder - b.sortOrder;
    if (byOrder !== 0) return byOrder;
  }
  return a.id - b.id;
}

/** Returns a new sorted array. Does not mutate input. */
export function sortTasks(tasks: Task[], mode: TaskSortMode): Task[] {
  return [...tasks].sort((a, b) => compareTasksBySort(a, b, mode));
}
