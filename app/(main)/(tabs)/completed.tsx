import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, FlatList, Keyboard } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import ToDoItem from '@/components/tasks/ToDoItem';
import TaskSearchBar, {
  TASK_LIST_INSET,
  TaskSearchToggle,
} from '@/components/tasks/TaskSearchBar';
import ScreenBackground from '@/components/ui/ScreenBackground';
import { tokens } from '@/constants/theme';
import { toastForError } from '@/lib/networkError';
import { filterTasksBySearch } from '@/lib/taskSearch';

export default function CompletedTasksScreen() {
  const navigation = useNavigation();
  const { completedTasks, loading, toggleTask, deleteTask } = useTasks();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const visibleTasks = useMemo(
    () => filterTasksBySearch(completedTasks, searchQuery),
    [completedTasks, searchQuery]
  );
  const hasSearch = searchQuery.trim().length > 0;

  const toggleSearch = useCallback(() => setSearchOpen((prev) => !prev), []);

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
      headerRight: () => (
        <TaskSearchToggle open={searchOpen} hasQuery={hasSearch} onPress={toggleSearch} />
      ),
    });
  }, [navigation, searchOpen, hasSearch, toggleSearch]);

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

  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.panel}>
        <View style={styles.contentInset}>
          <TaskSearchBar
            visible={searchOpen}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading tasks…</Text>
            </View>
          ) : (
            <FlatList
              style={styles.list}
              data={visibleTasks}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.listContent,
                visibleTasks.length === 0 && styles.listEmpty,
              ]}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Search size={48} color={colors.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {hasSearch ? 'No matching tasks' : 'No completed tasks'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {hasSearch
                      ? 'Try a different search term'
                      : 'Mark a task as done to see it here'}
                  </Text>
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
          )}
        </View>
      </View>
    </ScreenBackground>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    panel: {
      flex: 1,
      width: '100%',
      maxWidth: tokens.contentMaxWidth,
      paddingTop: 0,
      paddingBottom: 8,
      paddingHorizontal: 6,
      minHeight: 0,
      overflow: 'visible',
    },
    contentInset: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: TASK_LIST_INSET,
      paddingTop: TASK_LIST_INSET,
    },
    list: {
      flex: 1,
      minHeight: 0,
    },
    listContent: {
      paddingBottom: 14,
      flexGrow: 1,
    },
    listEmpty: {
      flexGrow: 1,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 40,
    },
    emptyIcon: {
      padding: 16,
      borderRadius: 999,
      backgroundColor: colors.primaryLight,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.textMuted,
    },
  });
}
