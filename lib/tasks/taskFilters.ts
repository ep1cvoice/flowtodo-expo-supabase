import { taskMatchesScheduledDay } from '@/lib/calendar/calendarDate';
import { filterTasksBySearch } from '@/lib/tasks/taskSearch';
import { sortTasks, type TaskSortMode } from '@/lib/tasks/taskSort';
import type { Task } from '@/types';

export function filterTasksByLabels(
  tasks: Task[],
  categoryIds: number[],
  tagIds: number[]
): Task[] {
  if (categoryIds.length === 0 && tagIds.length === 0) return tasks;

  return tasks.filter((task) => {
    if (categoryIds.length > 0) {
      if (task.categoryId === null || !categoryIds.includes(task.categoryId)) {
        return false;
      }
    }
    if (tagIds.length > 0) {
      const taskTagIds = new Set((task.tags ?? []).map((t) => t.id));
      // OR within tags: match if task has any selected tag
      if (!tagIds.some((id) => taskTagIds.has(id))) return false;
    }
    return true;
  });
}

export function filterActiveTaskList(
  tasks: Task[],
  options: {
    sortMode: TaskSortMode;
    categoryIds: number[];
    tagIds: number[];
    searchQuery: string;
    selectedDay: Date | null;
  }
): Task[] {
  const sorted = sortTasks(tasks, options.sortMode);
  const byLabels = filterTasksByLabels(sorted, options.categoryIds, options.tagIds);
  const bySearch = filterTasksBySearch(byLabels, options.searchQuery);
  if (!options.selectedDay) return bySearch;
  return bySearch.filter((task) => taskMatchesScheduledDay(task, options.selectedDay));
}

export function getActiveEmptyCopy(options: {
  hasDayFilter: boolean;
  hasSearch: boolean;
  hasFilters: boolean;
  validCategoryIds: number[];
  validTagIds: number[];
}): { title: string; text: string } {
  const { hasDayFilter, hasSearch, hasFilters, validCategoryIds, validTagIds } = options;

  if (hasDayFilter && !hasSearch && !hasFilters) {
    return {
      title: 'No tasks on this day',
      text: 'Create a task or pick another day',
    };
  }
  if (hasSearch && !hasFilters) {
    return {
      title: 'No matching tasks',
      text: 'Try a different search term',
    };
  }
  if (hasSearch && hasFilters) {
    return {
      title: 'No matching tasks',
      text: 'Try clearing search or filters',
    };
  }
  if (!hasFilters) {
    return {
      title: 'No active tasks',
      text: 'Create your first task to get started',
    };
  }
  if (validTagIds.length > 0 && validCategoryIds.length > 0) {
    return {
      title: 'No matching tasks',
      text: 'Try clearing some filters or create a task with these labels',
    };
  }
  if (validTagIds.length > 0) {
    return {
      title: 'No tasks with these tags',
      text: 'Try removing some tag filters or assign these tags to a task',
    };
  }
  return {
    title: 'No tasks in these categories',
    text: 'Add a category to an existing task or create a new one',
  };
}
