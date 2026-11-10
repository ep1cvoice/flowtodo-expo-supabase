import { useDeferredValue, useMemo } from 'react';
import {
  clampFilterLimit,
  FILTER_LIMIT_DEFAULT,
} from '@/shared/constants/filterLimits';
import { useAuth } from '@/core/auth/AuthContext';
import { useTasksState } from '@/features/tasks/TasksContext';
import {
  filterActiveTaskList,
  getActiveEmptyCopy,
} from '@/features/tasks/lib/taskFilters';
import { useDayFilter } from '@/features/tasks/lib/useDayFilter';
import { useLabelFilter } from '@/features/tasks/lib/useLabelFilter';
import { useTaskSearch } from '@/features/tasks/lib/useTaskSearch';
import { useTaskSort } from '@/features/tasks/lib/useTaskSort';

export function useActiveTaskFilters() {
  const { user } = useAuth();
  const { activeTasks, categories, tags } = useTasksState();
  const search = useTaskSearch();
  const { sortMode, handleSelectSort } = useTaskSort();
  const day = useDayFilter(activeTasks);

  const maxFilterSelections = clampFilterLimit(
    user?.settings?.maxFilterSelections ?? FILTER_LIMIT_DEFAULT
  );
  const labels = useLabelFilter(categories, tags, maxFilterSelections);
  const { validCategoryIds, validTagIds, hasFilters } = labels;
  const { selectedDay, hasDayFilter } = day;

  // The search input follows the raw query; filtering the whole list can lag a keystroke.
  const deferredSearchQuery = useDeferredValue(search.searchQuery);

  const hasListConstraints = hasFilters || search.hasSearch || hasDayFilter;
  const isManualSort = sortMode === 'manual';

  const filteredTasks = useMemo(
    () =>
      filterActiveTaskList(activeTasks, {
        sortMode,
        categoryIds: validCategoryIds,
        tagIds: validTagIds,
        searchQuery: deferredSearchQuery,
        selectedDay,
      }),
    [activeTasks, sortMode, validCategoryIds, validTagIds, deferredSearchQuery, selectedDay]
  );

  const canReorder = isManualSort && filteredTasks.length > 1;

  const emptyCopy = getActiveEmptyCopy({
    hasDayFilter,
    hasSearch: search.hasSearch,
    hasFilters,
    validCategoryIds,
    validTagIds,
  });

  return {
    ...search,
    ...day,
    ...labels,
    activeTasks,
    sortMode,
    handleSelectSort,
    maxFilterSelections,
    hasListConstraints,
    filteredTasks,
    canReorder,
    emptyCopy,
  };
}
