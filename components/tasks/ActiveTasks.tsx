import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import ToDoItem from '@/components/tasks/ToDoItem';
import CreateTaskButton from '@/components/tasks/CreateTaskButton';
import AddTaskModal from '@/components/tasks/AddTaskModal';
import TaskFilterBar from '@/components/tasks/TaskFilterBar';
import TaskFilterSheet from '@/components/tasks/TaskFilterSheet';
import type { AppColors } from '@/constants/theme';

function toggleId(prev: number[], id: number): number[] {
  return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
}

export default function ActiveTasks() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { activeTasks, categories, tags, addTask, toggleTask, deleteTask } = useTasks();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const handleToggle = useCallback(
    async (id: number) => {
      try {
        await toggleTask(id);
      } catch {
        showToast('Could not update task.', 'error');
      }
    },
    [toggleTask, showToast]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteTask(id);
        showToast('Task deleted.');
      } catch {
        showToast('Could not delete task.', 'error');
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

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.tasksList}
        contentContainerStyle={[
          styles.tasksContent,
          filteredTasks.length === 0 && styles.tasksContentEmpty,
        ]}
        data={filteredTasks}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Search size={68} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={styles.emptyText}>{emptyCopy.text}</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <ToDoItem
            task={item}
            index={index}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}
      />

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
    },
    tasksList: {
      flex: 1,
      minHeight: 0,
    },
    tasksContent: {
      paddingBottom: 10,
      flexGrow: 1,
    },
    tasksContentEmpty: {
      flexGrow: 1,
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
