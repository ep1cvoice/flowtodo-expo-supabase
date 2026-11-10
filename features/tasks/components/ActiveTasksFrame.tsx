import { strings } from '@/shared/lib/strings';
import type { ReactNode } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import ActiveTasksHeader from '@/features/tasks/components/ActiveTasksHeader';
import TasksLoadError from '@/features/tasks/components/TasksLoadError';
import TaskFilterSheet from '@/features/tasks/components/filters/TaskFilterSheet';
import TaskSearchBar from '@/features/tasks/components/filters/TaskSearchBar';
import TaskSortMenu from '@/features/tasks/components/filters/TaskSortMenu';
import { TaskItemModalsProvider } from '@/features/tasks/components/item/TaskItemModalsContext';
import type { ActiveTasksView } from '@/features/tasks/lib/useActiveTasksScreen';

interface ActiveTasksFrameProps {
  view: ActiveTasksView;
  // The platform-specific list; rendered once tasks have loaded; a load error replaces it.
  children: ReactNode;
}

// Shared chrome of the active tasks screen: search bar, loading state, filter and sort sheets.
export default function ActiveTasksFrame({ view, children }: ActiveTasksFrameProps) {
  const {
    colors,
    styles,
    categories,
    tags,
    loading,
    error,
    retry,
    filters,
    showFilterSheet,
    setShowFilterSheet,
    showSortSheet,
    setShowSortSheet,
  } = view;

  return (
    <View style={styles.container}>
      <View style={styles.contentInset}>
        <TaskSearchBar
          visible={filters.searchOpen}
          value={filters.searchQuery}
          onChangeText={filters.setSearchQuery}
        />
        {loading ? (
          <>
            <ActiveTasksHeader filters={filters} />
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{strings.common.loadingTasks}</Text>
            </View>
          </>
        ) : error ? (
          <TasksLoadError onRetry={retry} />
        ) : (
          <View style={styles.listArea}>
            <TaskItemModalsProvider onToggle={view.handleToggle} onDelete={view.handleDelete}>
              {children}
            </TaskItemModalsProvider>
          </View>
        )}
      </View>

      <TaskFilterSheet
        visible={showFilterSheet}
        categories={categories}
        tags={tags}
        selectedCategoryIds={filters.validCategoryIds}
        selectedTagIds={filters.validTagIds}
        maxFilterSelections={filters.maxFilterSelections}
        onClearCategories={() => filters.setSelectedCategoryIds([])}
        onToggleCategory={filters.handleToggleCategory}
        onClearTags={() => filters.setSelectedTagIds([])}
        onToggleTag={filters.handleToggleTag}
        onClear={filters.clearFilters}
        onClose={() => setShowFilterSheet(false)}
      />

      <TaskSortMenu
        visible={showSortSheet}
        mode={filters.sortMode}
        onSelect={filters.handleSelectSort}
        onClose={() => setShowSortSheet(false)}
      />
    </View>
  );
}
