import { useCallback, useMemo } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, FlatList } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import ToDoItem from '@/components/tasks/ToDoItem';
import ScreenBackground from '@/components/ui/ScreenBackground';
import { tokens } from '@/constants/theme';
import { toastForError } from '@/lib/networkError';

export default function CompletedTasksScreen() {
  const { completedTasks, loading, toggleTask, deleteTask } = useTasks();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading tasks…</Text>
          </View>
        ) : (
          <FlatList
            data={completedTasks}
            keyExtractor={(item) => String(item.id)}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            contentContainerStyle={[
              styles.listContent,
              completedTasks.length === 0 && styles.listEmpty,
            ]}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Search size={48} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No completed tasks</Text>
                <Text style={styles.emptyText}>Mark a task as done to see it here</Text>
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
      padding: 16,
      minHeight: 0,
    },
    listContent: {
      paddingBottom: 16,
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
