import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from 'expo-router';
import { Search } from 'lucide-react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import ToDoItem from '@/components/tasks/ToDoItem';
import CreateTaskButton from '@/components/tasks/CreateTaskButton';
import AddTaskModal from '@/components/tasks/AddTaskModal';
import TaskFilterBar from '@/components/tasks/TaskFilterBar';
import TaskFilterSheet from '@/components/tasks/TaskFilterSheet';
import type { AppColors } from '@/constants/theme';
import { toastForError } from '@/lib/networkError';
import { applyFilteredReorder } from '@/lib/taskReorder';
import type { Task } from '@/types';

function toggleId(prev: number[], id: number): number[] {
  return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
}

const isWeb = Platform.OS === 'web';

export default function ActiveTasks() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { showToast } = useToast();
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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

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

  const validCategoryIds = useMemo(
    () => selectedCategoryIds.filter((id) => categories.some((c) => c.id === id)),
    [selectedCategoryIds, categories]
  );
  const validTagIds = useMemo(
    () => selectedTagIds.filter((id) => tags.some((t) => t.id === id)),
    [selectedTagIds, tags]
  );
  const hasFilters = validCategoryIds.length > 0 || validTagIds.length > 0;

  const filteredTasks = useMemo(() => {
    return activeTasks.filter((task) => {
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
  }, [activeTasks, validCategoryIds, validTagIds]);

  const canReorder = filteredTasks.length > 1;

  const clearFilters = useCallback(() => {
    setSelectedCategoryIds([]);
    setSelectedTagIds([]);
  }, []);

  const openFilterSheet = useCallback(() => setShowFilterSheet(true), []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TaskFilterBar
          variant="header"
          categories={categories}
          tags={tags}
          selectedCategoryIds={validCategoryIds}
          selectedTagIds={validTagIds}
          onOpen={openFilterSheet}
          onClear={clearFilters}
        />
      ),
    });
  }, [
    navigation,
    categories,
    tags,
    validCategoryIds,
    validTagIds,
    openFilterSheet,
    clearFilters,
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
      const orderedActive = hasFilters
        ? applyFilteredReorder(activeTasks, reorderedFiltered)
        : reorderedFiltered;
      persistOrder(orderedActive);
    },
    [activeTasks, hasFilters, persistOrder]
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
      <ScaleDecorator activeScale={1.05}>
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
    [
      beginDrag,
      canReorder,
      handleDelete,
      handleToggle,
      styles.itemDragging,
      styles.itemWrap,
    ]
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
    canReorder && !isWeb && styles.tasksContentDragPad,
    filteredTasks.length === 0 && styles.tasksContentEmpty,
  ];

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading tasks…</Text>
        </View>
      ) : isWeb ? (
        <FlatList
          style={styles.tasksList}
          contentContainerStyle={listContentStyle}
          data={filteredTasks}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={emptyComponent}
          renderItem={renderWebItem}
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
        />
      )}

      <View style={styles.activeFooter}>
        <CreateTaskButton onPress={() => setShowCreateModal(true)} />
      </View>

      <AddTaskModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={addTask}
        categories={categories}
        tags={tags}
      />

      <TaskFilterSheet
        visible={showFilterSheet}
        categories={categories}
        tags={tags}
        selectedCategoryIds={validCategoryIds}
        selectedTagIds={validTagIds}
        onClearCategories={() => setSelectedCategoryIds([])}
        onToggleCategory={(id) => setSelectedCategoryIds((prev) => toggleId(prev, id))}
        onClearTags={() => setSelectedTagIds([])}
        onToggleTag={(id) => setSelectedTagIds((prev) => toggleId(prev, id))}
        onClear={clearFilters}
        onClose={() => setShowFilterSheet(false)}
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
    tasksList: {
      flex: 1,
      minHeight: 0,
      overflow: 'visible',
    },
    tasksContent: {
      paddingBottom: 10,
      flexGrow: 1,
    },
    // Padding on all sides so ScaleDecorator growth isn't clipped by the list.
    tasksContentDragPad: {
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 14,
    },
    tasksContentEmpty: {
      flexGrow: 1,
    },
    itemWrap: {
      marginBottom: 6,
      overflow: 'visible',
    },
    itemDragging: {
      zIndex: 20,
      overflow: 'visible',
      shadowColor: '#0f172a',
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
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
      flex: 1,
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
    activeFooter: {
      width: '100%',
      alignItems: 'stretch',
      paddingTop: 10,
    },
  });
}
