import { strings } from '@/shared/lib/strings';
import { taskMatchesScheduledDay } from '@/features/tasks/lib/calendarDate';
import { filterTasksBySearch } from '@/features/tasks/lib/taskSearch';
import { sortTasks, type TaskSortMode } from '@/features/tasks/lib/taskSort';
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
      title: strings.tasks.empty.noTasksOnDay.title,
      text: strings.tasks.empty.noTasksOnDay.text,
    };
  }
  if (hasSearch && !hasFilters) {
    return {
      title: strings.tasks.empty.noMatchSearch.title,
      text: strings.tasks.empty.noMatchSearch.text,
    };
  }
  if (hasSearch && hasFilters) {
    return {
      title: strings.tasks.empty.noMatchSearchOrFilters.title,
      text: strings.tasks.empty.noMatchSearchOrFilters.text,
    };
  }
  if (!hasFilters) {
    return {
      title: strings.tasks.empty.noActive.title,
      text: strings.tasks.empty.noActive.text,
    };
  }
  if (validTagIds.length > 0 && validCategoryIds.length > 0) {
    return {
      title: strings.tasks.empty.noMatchFilters.title,
      text: strings.tasks.empty.noMatchFilters.text,
    };
  }
  if (validTagIds.length > 0) {
    return {
      title: strings.tasks.empty.noMatchTags.title,
      text: strings.tasks.empty.noMatchTags.text,
    };
  }
  return {
    title: strings.tasks.empty.noMatchCategories.title,
    text: strings.tasks.empty.noMatchCategories.text,
  };
}
