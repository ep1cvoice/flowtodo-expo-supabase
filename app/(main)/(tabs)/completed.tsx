import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import ToDoItem from '@/components/tasks/ToDoItem';
import ScreenBackground from '@/components/ui/ScreenBackground';
import { tokens } from '@/constants/theme';

export default function CompletedTasksScreen() {
  const { completedTasks, toggleTask, deleteTask } = useTasks();
  const { colors } = useTheme();
  const { showToast } = useToast();

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

  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.panel}>
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
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
                <Search size={48} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                No completed tasks
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Mark a task as done to see it here
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
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
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
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
