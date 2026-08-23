import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from 'expo-router';
import { Search } from 'lucide-react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useAuth } from '@/context/AuthContext';
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
import {
  clampFilterLimit,
  FILTER_LIMIT_DEFAULT,
} from '@/constants/filterLimits';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import {
  collectMarkedDayKeys,
  taskMatchesScheduledDay,
} from '@/lib/calendarDate';
import { toastForError } from '@/lib/networkError';
import { applyFilteredReorder } from '@/lib/taskReorder';
import { filterTasksBySearch } from '@/lib/taskSearch';
import { isTaskSortMode, sortTasks, type TaskSortMode } from '@/lib/taskSort';
import type { Task } from '@/types';

const isWeb = Platform.OS === 'web';
const SORT_STORAGE_KEY = '@flowtodo/active-task-sort';

export default function ActiveTasks() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < tokens.desktopBreakpoint;
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    activeTasks,
    categories,
    tags,
    loading,
    addTask,
    toggleTask,
    deleteTask,
    reorderTasks,
  } = useTasks();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
      setSelectedTagIds((tags) => {
        const room = maxFilterSelections - nextCats.length;
        return tags.length > room ? tags.slice(0, room) : tags;
      });
      return nextCats;
    });
  }, [maxFilterSelections]);

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
  const hasSearch = searchQuery.trim().length > 0;
  const hasDayFilter = selectedDay != null;
  const hasListConstraints = hasFilters || hasSearch || hasDayFilter;
  const isManualSort = sortMode === 'manual';

  const markedDays = useMemo(() => collectMarkedDayKeys(activeTasks), [activeTasks]);

  const filteredTasks = useMemo(() => {
    const sorted = sortTasks(activeTasks, sortMode);
    const byLabels = sorted.filter((task) => {
      if (validCategoryIds.length > 0) {
        if (task.categoryId === null || !validCategoryIds.includes(task.categoryId)) {
          return false;
        }
      }
      if (validTagIds.length > 0) {
        const taskTagIds = new Set((task.tags ?? []).map((t) => t.id));
        // OR within tags: match if task has any selected tag
        if (!validTagIds.some((id) => taskTagIds.has(id))) return false;
      }
      return true;
    });
    const bySearch = filterTasksBySearch(byLabels, searchQuery);
    if (!selectedDay) return bySearch;
    return bySearch.filter((task) => taskMatchesScheduledDay(task, selectedDay));
  }, [activeTasks, sortMode, validCategoryIds, validTagIds, searchQuery, selectedDay]);

  const canReorder = isManualSort && filteredTasks.length > 1;

  const clearFilters = useCallback(() => {
    setSelectedCategoryIds([]);
    setSelectedTagIds([]);
  }, []);

  const openFilterSheet = useCallback(() => setShowFilterSheet(true), []);
  const openSortSheet = useCallback(() => setShowSortSheet(true), []);
  const toggleSearch = useCallback(() => setSearchOpen((prev) => !prev), []);

  const handleSelectSort = useCallback((mode: TaskSortMode) => {
    setSortMode(mode);
    AsyncStorage.setItem(SORT_STORAGE_KEY, mode).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setSearchOpen(false);
        Keyboard.dismiss();
      };
    }, [])
  );

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
    hasFilters,
    categories,
    tags,
    validCategoryIds,
    validTagIds,
    openFilterSheet,
    clearFilters,
    searchOpen,
    hasSearch,
    toggleSearch,
    sortMode,
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
      const orderedActive = hasListConstraints
        ? applyFilteredReorder(activeTasks, reorderedFiltered)
        : reorderedFiltered;
      persistOrder(orderedActive);
    },
    [activeTasks, hasListConstraints, persistOrder]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Task[] }) => {
      if (!canReorder || isWeb) return;
      const orderChanged = data.some((task, i) => task.id !== filteredTasks[i]?.id);
      if (!orderChanged) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      persistVisibleOrder(data);
    },
    [canReorder, filteredTasks, persistVisibleOrder]
  );

  const beginDrag = useCallback((drag: () => void) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    drag();
  }, []);

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

  const renderNativeItem = useCallback(
    ({ item, drag, getIndex, isActive }: RenderItemParams<Task>) => (
      <ScaleDecorator activeScale={1.04}>
        <View style={[styles.itemWrap, isActive && styles.itemDragging]}>
          <ToDoItem
            task={item}
            index={getIndex() ?? 0}
            onToggle={handleToggle}
            onDelete={handleDelete}
            drag={canReorder ? () => beginDrag(drag) : undefined}
          />
        </View>
      </ScaleDecorator>
    ),
    [beginDrag, canReorder, handleDelete, handleToggle, styles.itemDragging, styles.itemWrap]
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

  const emptyCopy = (() => {
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
  })();

  const emptyComponent = (
    <View style={styles.emptyState}>
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Search size={68} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
        <Text style={styles.emptyText}>{emptyCopy.text}</Text>
      </View>
    </View>
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
              <DraggableFlatList
                style={styles.tasksList}
                containerStyle={styles.tasksList}
                contentContainerStyle={listContentStyle}
                data={filteredTasks}
                keyExtractor={(item) => String(item.id)}
                onDragEnd={handleDragEnd}
                activationDistance={canReorder ? 8 : 9999}
                ListEmptyComponent={emptyComponent}
                renderItem={renderNativeItem}
                keyboardShouldPersistTaps="handled"
              />
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
      overflow: 'visible',
    },
    itemDragging: {
      zIndex: 30,
      overflow: 'visible',
      shadowColor: '#0f172a',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 12,
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
    emptyState: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 12,
    },
    emptyIconWrap: {
      padding: 20,
      borderRadius: 999,
      backgroundColor: colors.primaryLight,
      borderWidth: 12,
      borderColor: colors.todoHighlight,
    },
    emptyTitle: {
      margin: 0,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    emptyText: {
      margin: 0,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
