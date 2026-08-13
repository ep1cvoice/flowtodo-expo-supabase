import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  SectionList,
  Keyboard,
} from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import ToDoItem from '@/components/tasks/ToDoItem';
import TaskSearchBar, { TaskSearchToggle } from '@/components/tasks/TaskSearchBar';
import ScreenBackground from '@/components/ui/ScreenBackground';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { groupCompletedTasks } from '@/lib/completedGroups';
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
  const sections = useMemo(() => groupCompletedTasks(visibleTasks), [visibleTasks]);
  const hasSearch = searchQuery.trim().length > 0;
  const isEmpty = visibleTasks.length === 0;

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
          <SectionList
            style={styles.list}
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            stickySectionHeadersEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.listContent, isEmpty && styles.listEmpty]}
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
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.data.length}</Text>
              </View>
            )}
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    panel: {
      flex: 1,
      width: '100%',
      maxWidth: tokens.contentMaxWidth,
      paddingVertical: 8,
      paddingHorizontal: 6,
      minHeight: 0,
      overflow: 'visible',
    },
    list: {
      flex: 1,
      minHeight: 0,
    },
    listContent: {
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 14,
      flexGrow: 1,
    },
    listEmpty: {
      flexGrow: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingTop: 4,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      color: colors.textSecondary,
    },
    sectionCount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
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
