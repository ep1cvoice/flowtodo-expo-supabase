import { strings } from '@/shared/lib/strings';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useNavigation } from 'expo-router';
import { useCreateTask } from '@/features/tasks/CreateTaskContext';
import { useTasks } from '@/features/tasks/TasksContext';
import { useTaskActions } from '@/features/tasks/lib/useTaskActions';
import { useTheme } from '@/shared/providers/ThemeContext';
import { createActiveTasksStyles } from '@/features/tasks/components/activeTasksStyles';
import TaskFilterBar from '@/features/tasks/components/filters/TaskFilterBar';
import { tokens } from '@/shared/constants/theme';
import { useTaskReorder } from '@/features/tasks/lib/useTaskReorder';
import { useActiveTaskFilters } from '@/features/tasks/lib/useActiveTaskFilters';

// State and handlers shared by the web and native ActiveTasks screens; only the list rendering
// differs per platform (see ActiveTasks.web.tsx / ActiveTasks.native.tsx).
export function useActiveTasksScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < tokens.desktopBreakpoint;
  const { colors } = useTheme();
  const styles = useMemo(() => createActiveTasksStyles(colors), [colors]);
  const { categories, tags, loading } = useTasks();
  const { setScheduledDay } = useCreateTask();
  const filters = useActiveTaskFilters();
  const {
    activeTasks,
    searchOpen,
    hasSearch,
    toggleSearch,
    sortMode,
    selectedDay,
    validCategoryIds,
    validTagIds,
    hasFilters,
    hasListConstraints,
    filteredTasks,
    canReorder,
    clearFilters,
  } = filters;
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);

  useEffect(() => {
    setScheduledDay('active', selectedDay);
  }, [selectedDay, setScheduledDay]);

  const { handleToggle, handleDelete } = useTaskActions();

  const openFilterSheet = useCallback(() => setShowFilterSheet(true), []);
  const openSortSheet = useCallback(() => setShowSortSheet(true), []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isMobile && hasFilters ? '' : strings.nav.allTasks,
      headerRight: () => (
        <TaskFilterBar
          variant="header"
          categories={categories}
          tags={tags}
          selectedCategoryIds={validCategoryIds}
          selectedTagIds={validTagIds}
          onOpen={openFilterSheet}
          onClear={clearFilters}
          searchOpen={searchOpen}
          searchHasQuery={hasSearch}
          onToggleSearch={toggleSearch}
          sortMode={sortMode}
          onOpenSort={openSortSheet}
        />
      ),
    });
  }, [
    navigation,
    isMobile,
    categories,
    tags,
    hasFilters,
    validCategoryIds,
    validTagIds,
    clearFilters,
    searchOpen,
    hasSearch,
    toggleSearch,
    sortMode,
    openFilterSheet,
    openSortSheet,
  ]);

  const { handleDragEnd, moveTask } = useTaskReorder({
    activeTasks,
    filteredTasks,
    canReorder,
    hasListConstraints,
  });

  return {
    colors,
    styles,
    categories,
    tags,
    loading,
    filters,
    handleToggle,
    handleDelete,
    handleDragEnd,
    moveTask,
    showFilterSheet,
    setShowFilterSheet,
    showSortSheet,
    setShowSortSheet,
  };
}

export type ActiveTasksView = ReturnType<typeof useActiveTasksScreen>;
