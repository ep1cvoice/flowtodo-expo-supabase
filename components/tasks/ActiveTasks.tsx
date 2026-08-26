import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from 'expo-router';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridRenderItem } from 'react-native-sortables';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import ToDoItem from '@/components/tasks/ToDoItem';
import CreateTaskButton, {
  CREATE_TASK_FAB_CLEARANCE,
} from '@/components/tasks/CreateTaskButton';
import AddTaskModal from '@/components/tasks/AddTaskModal';
import TaskFilterBar from '@/components/tasks/TaskFilterBar';
import TaskFilterSheet from '@/components/tasks/TaskFilterSheet';
import TaskSearchBar, { TASK_LIST_INSET } from '@/components/tasks/TaskSearchBar';
import TaskSortSheet from '@/components/tasks/TaskSortMenu';
import ActiveDayCalendar from '@/components/tasks/ActiveDayCalendar';
import EmptyState from '@/components/ui/EmptyState';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { toastForError } from '@/lib/networkError';
import { applyFilteredReorder } from '@/lib/taskReorder';
import { useActiveTaskFilters } from '@/lib/useActiveTaskFilters';
import type { Task } from '@/types';

const isWeb = Platform.OS === 'web';

export default function ActiveTasks() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < tokens.desktopBreakpoint;
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { categories, tags, loading, addTask, toggleTask, deleteTask, reorderTasks } = useTasks();
  const {
    activeTasks,
    searchOpen,
    searchQuery,
    setSearchQuery,
    hasSearch,
    toggleSearch,
    sortMode,
    handleSelectSort,
    selectedDay,
    setSelectedDay,
    markedDays,
    validCategoryIds,
    validTagIds,
    maxFilterSelections,
    hasFilters,
    hasListConstraints,
    filteredTasks,
    canReorder,
    handleToggleCategory,
    handleToggleTag,
    clearFilters,
    emptyCopy,
    setSelectedCategoryIds,
    setSelectedTagIds,
  } = useActiveTaskFilters();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const handleToggle = useCallback(
    async (id: number) => {
      try {
        await toggleTask(id);
      } catch (err) {
        showToast(toastForError(err, 'Could not update task.'), 'error');
      }
    },
    [toggleTask, showToast]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteTask(id);
        showToast('Task deleted.');
      } catch (err) {
        showToast(toastForError(err, 'Could not delete task.'), 'error');
      }
    },
    [deleteTask, showToast]
  );

  const openFilterSheet = useCallback(() => setShowFilterSheet(true), []);
  const openSortSheet = useCallback(() => setShowSortSheet(true), []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isMobile && hasFilters ? '' : 'Active',
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

  const persistOrder = useCallback(
    (orderedActive: Task[]) => {
      void reorderTasks(
        orderedActive.map((task, index) => ({ id: task.id, sortOrder: index }))
      ).catch((err) => {
        console.warn('Failed to reorder tasks:', err?.message ?? err);
        showToast(toastForError(err, 'Could not save order.'), 'error');
      });
    },
    [reorderTasks, showToast]
  );

  const persistVisibleOrder = useCallback(
    (reorderedFiltered: Task[]) => {
      persistOrder(
        hasListConstraints
          ? applyFilteredReorder(activeTasks, reorderedFiltered)
          : reorderedFiltered
      );
    },
    [activeTasks, hasListConstraints, persistOrder]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Task[] }) => {
      if (!canReorder) return;
      if (data === filteredTasks) return;
      persistVisibleOrder(data);
    },
    [canReorder, filteredTasks, persistVisibleOrder]
  );

  const moveTask = useCallback(
    (taskId: number, direction: -1 | 1) => {
      if (!canReorder) return;
      const list = [...filteredTasks];
      const index = list.findIndex((task) => task.id === taskId);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= list.length) return;
      const next = [...list];
      const tmp = next[index];
      next[index] = next[swapIndex];
      next[swapIndex] = tmp;
      persistVisibleOrder(next);
    },
    [canReorder, filteredTasks, persistVisibleOrder]
  );

  const renderNativeItem = useCallback<SortableGridRenderItem<Task>>(
    ({ item, index }) => (
      <View style={styles.itemWrap}>
        <Sortable.Handle
          mode={canReorder ? 'draggable' : 'non-draggable'}
          style={styles.itemHandle}>
          <ToDoItem
            task={item}
            index={index}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </Sortable.Handle>
      </View>
    ),
    [canReorder, handleDelete, handleToggle, styles.itemHandle, styles.itemWrap]
  );

  const renderWebItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => (
      <View style={styles.itemWrap}>
        <ToDoItem
          task={item}
          index={index}
          onToggle={handleToggle}
          onDelete={handleDelete}
          showReorderButtons={canReorder}
          canMoveUp={canReorder && index > 0}
          canMoveDown={canReorder && index < filteredTasks.length - 1}
          onMoveUp={() => moveTask(item.id, -1)}
          onMoveDown={() => moveTask(item.id, 1)}
        />
      </View>
    ),
    [
      canReorder,
      filteredTasks.length,
      handleDelete,
      handleToggle,
      moveTask,
      styles.itemWrap,
    ]
  );

  const emptyComponent = (
    <EmptyState title={emptyCopy.title} text={emptyCopy.text} />
  );

  const listContentStyle = [
    styles.tasksContent,
    styles.tasksContentPad,
    !isWeb && styles.tasksContentDragPad,
    filteredTasks.length === 0 && styles.tasksContentEmpty,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.contentInset}>
        <TaskSearchBar
          visible={searchOpen}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ActiveDayCalendar
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          markedDays={markedDays}
        />
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading tasks…</Text>
          </View>
        ) : (
          <View style={styles.listArea}>
            {isWeb ? (
              <FlatList
                style={styles.tasksList}
                contentContainerStyle={listContentStyle}
                data={filteredTasks}
                keyExtractor={(item) => String(item.id)}
                ListEmptyComponent={emptyComponent}
                renderItem={renderWebItem}
                keyboardShouldPersistTaps="handled"
              />
            ) : (
              <Animated.ScrollView
                ref={scrollableRef}
                style={styles.tasksList}
                contentContainerStyle={listContentStyle}
                keyboardShouldPersistTaps="handled">
                {filteredTasks.length === 0 ? (
                  emptyComponent
                ) : (
                  <Sortable.Grid
                    columns={1}
                    data={filteredTasks}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderNativeItem}
                    onDragEnd={handleDragEnd}
                    scrollableRef={scrollableRef}
                    customHandle
                    sortEnabled={canReorder}
                    dragActivationDelay={450}
                    activeItemScale={1.04}
                    inactiveItemOpacity={1}
                    hapticsEnabled
                    itemEntering={null}
                    itemExiting={null}
                    itemsLayoutTransitionMode="reorder"
                  />
                )}
              </Animated.ScrollView>
            )}
          </View>
        )}
      </View>

      <CreateTaskButton onPress={() => setShowCreateModal(true)} />

      <AddTaskModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={addTask}
        categories={categories}
        tags={tags}
        defaultScheduled={selectedDay}
      />

      <TaskFilterSheet
        visible={showFilterSheet}
        categories={categories}
        tags={tags}
        selectedCategoryIds={validCategoryIds}
        selectedTagIds={validTagIds}
        maxFilterSelections={maxFilterSelections}
        onClearCategories={() => setSelectedCategoryIds([])}
        onToggleCategory={handleToggleCategory}
        onClearTags={() => setSelectedTagIds([])}
        onToggleTag={handleToggleTag}
        onClear={clearFilters}
        onClose={() => setShowFilterSheet(false)}
      />

      <TaskSortSheet
        visible={showSortSheet}
        mode={sortMode}
        onSelect={handleSelectSort}
        onClose={() => setShowSortSheet(false)}
      />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
      overflow: 'visible',
    },
    contentInset: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: TASK_LIST_INSET,
      paddingTop: TASK_LIST_INSET,
      overflow: 'visible',
    },
    listArea: {
      flex: 1,
      minHeight: 0,
      overflow: 'visible',
    },
    tasksList: {
      flex: 1,
      minHeight: 0,
      overflow: 'visible',
    },
    tasksContent: {
      flexGrow: 1,
    },
    tasksContentPad: {
      paddingBottom: CREATE_TASK_FAB_CLEARANCE,
    },
    tasksContentDragPad: {
      paddingTop: 6,
    },
    tasksContentEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    itemWrap: {
      width: '100%',
      overflow: 'visible',
    },
    itemHandle: {
      width: '100%',
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
  });
}
