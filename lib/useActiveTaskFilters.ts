import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clampFilterLimit,
  FILTER_LIMIT_DEFAULT,
} from '@/constants/filterLimits';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TasksContext';
import { useToast } from '@/context/ToastContext';
import { collectMarkedDayKeys } from '@/lib/calendarDate';
import {
  filterActiveTaskList,
  getActiveEmptyCopy,
} from '@/lib/taskFilters';
import { isTaskSortMode, type TaskSortMode } from '@/lib/taskSort';
import { useTaskSearch } from '@/lib/useTaskSearch';

const SORT_STORAGE_KEY = '@flowtodo/active-task-sort';

export function useActiveTaskFilters() {
  const { user } = useAuth();
  const { activeTasks, categories, tags } = useTasks();
  const { showToast } = useToast();
  const search = useTaskSearch();
  const [sortMode, setSortMode] = useState<TaskSortMode>('manual');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const maxFilterSelections = clampFilterLimit(
    user?.settings?.maxFilterSelections ?? FILTER_LIMIT_DEFAULT
  );

  useEffect(() => {
    AsyncStorage.getItem(SORT_STORAGE_KEY)
      .then((value) => {
        if (isTaskSortMode(value)) setSortMode(value);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedCategoryIds((cats) => {
      const nextCats =
        cats.length > maxFilterSelections ? cats.slice(0, maxFilterSelections) : cats;
      setSelectedTagIds((currentTags) => {
        const room = maxFilterSelections - nextCats.length;
        return currentTags.length > room ? currentTags.slice(0, room) : currentTags;
      });
      return nextCats;
    });
  }, [maxFilterSelections]);

  const handleToggleCategory = useCallback(
    (id: number) => {
      setSelectedCategoryIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length + selectedTagIds.length >= maxFilterSelections) {
          showToast(
            `You can select up to ${maxFilterSelections} categories and tags combined.`,
            'error'
          );
          return prev;
        }
        return [...prev, id];
      });
    },
    [maxFilterSelections, selectedTagIds.length, showToast]
  );

  const handleToggleTag = useCallback(
    (id: number) => {
      setSelectedTagIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (selectedCategoryIds.length + prev.length >= maxFilterSelections) {
          showToast(
            `You can select up to ${maxFilterSelections} categories and tags combined.`,
            'error'
          );
          return prev;
        }
        return [...prev, id];
      });
    },
    [maxFilterSelections, selectedCategoryIds.length, showToast]
  );

  const validCategoryIds = useMemo(
    () => selectedCategoryIds.filter((id) => categories.some((c) => c.id === id)),
    [selectedCategoryIds, categories]
  );
  const validTagIds = useMemo(
    () => selectedTagIds.filter((id) => tags.some((t) => t.id === id)),
    [selectedTagIds, tags]
  );
  const hasFilters = validCategoryIds.length > 0 || validTagIds.length > 0;
  const hasDayFilter = selectedDay != null;
  const hasListConstraints = hasFilters || search.hasSearch || hasDayFilter;
  const isManualSort = sortMode === 'manual';

  const markedDays = useMemo(() => collectMarkedDayKeys(activeTasks), [activeTasks]);

  const filteredTasks = useMemo(
    () =>
      filterActiveTaskList(activeTasks, {
        sortMode,
        categoryIds: validCategoryIds,
        tagIds: validTagIds,
        searchQuery: search.searchQuery,
        selectedDay,
      }),
    [
      activeTasks,
      sortMode,
      validCategoryIds,
      validTagIds,
      search.searchQuery,
      selectedDay,
    ]
  );

  const canReorder = isManualSort && filteredTasks.length > 1;

  const clearFilters = useCallback(() => {
    setSelectedCategoryIds([]);
    setSelectedTagIds([]);
  }, []);

  const handleSelectSort = useCallback((mode: TaskSortMode) => {
    setSortMode(mode);
    AsyncStorage.setItem(SORT_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const emptyCopy = getActiveEmptyCopy({
    hasDayFilter,
    hasSearch: search.hasSearch,
    hasFilters,
    validCategoryIds,
    validTagIds,
  });

  return {
    ...search,
    activeTasks,
    sortMode,
    handleSelectSort,
    selectedDay,
    setSelectedDay,
    markedDays,
    selectedCategoryIds,
    selectedTagIds,
    validCategoryIds,
    validTagIds,
    maxFilterSelections,
    hasFilters,
    hasDayFilter,
    hasListConstraints,
    filteredTasks,
    canReorder,
    handleToggleCategory,
    handleToggleTag,
    clearFilters,
    emptyCopy,
    setSelectedCategoryIds,
    setSelectedTagIds,
  };
}
