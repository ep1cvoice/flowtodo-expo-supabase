import { strings } from '@/shared/lib/strings';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { useTasks } from '@/features/tasks/TasksContext';
import { useTaskActions } from '@/features/tasks/lib/useTaskActions';
import { useTheme } from '@/shared/providers/ThemeContext';
import { useToast } from '@/shared/providers/ToastContext';
import ToDoItem from '@/features/tasks/components/item/ToDoItem';
import TaskSearchBar, {
  TASK_LIST_INSET,
  TaskSearchToggle,
} from '@/features/tasks/components/filters/TaskSearchBar';
import EmptyState from '@/shared/ui/EmptyState';
import ScreenBackground from '@/shared/ui/ScreenBackground';
import type { AppColors } from '@/shared/constants/theme';
import { tokens } from '@/shared/constants/theme';
import { groupCompletedTasks } from '@/features/tasks/lib/completedGroups';
import { toastForError } from '@/shared/lib/networkError';
import { filterTasksBySearch } from '@/features/tasks/lib/taskSearch';
import { useTaskSearch } from '@/features/tasks/lib/useTaskSearch';
import { webInteractive } from '@/shared/lib/pressableWeb';

export default function CompletedTasksScreen() {
  const navigation = useNavigation();
  const {
    completedTasks,
    loading,
    hasMoreCompleted,
    loadingMoreCompleted,
    loadMoreCompleted,
  } = useTasks();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    searchOpen,
    searchQuery,
    setSearchQuery,
    hasSearch,
    toggleSearch,
  } = useTaskSearch();

  const visibleTasks = useMemo(
    () => filterTasksBySearch(completedTasks, searchQuery),
    [completedTasks, searchQuery]
  );
  const sections = useMemo(() => groupCompletedTasks(visibleTasks), [visibleTasks]);
  const isEmpty = visibleTasks.length === 0;
  const showLoadMore = hasMoreCompleted && !hasSearch;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TaskSearchToggle open={searchOpen} hasQuery={hasSearch} onPress={toggleSearch} />
      ),
    });
  }, [navigation, searchOpen, hasSearch, toggleSearch]);

  const { handleToggle, handleDelete } = useTaskActions();

  const handleLoadMore = useCallback(async () => {
    try {
      await loadMoreCompleted();
    } catch (err) {
      showToast(toastForError(err, strings.tasks.loadMoreFailed), 'error');
    }
  }, [loadMoreCompleted, showToast]);

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
              <Text style={styles.loadingText}>{strings.common.loadingTasks}</Text>
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
                <EmptyState
                  variant="plain"
                  title={hasSearch ? strings.tasks.empty.noMatchSearch.title : strings.tasks.noCompleted}
                  text={
                    hasSearch
                      ? strings.tasks.empty.noMatchSearch.text
                      : strings.tasks.noCompletedHint
                  }
                />
              }
              ListFooterComponent={
                showLoadMore ? (
                  <View style={styles.footer}>
                    <Pressable
                      onPress={() => void handleLoadMore()}
                      disabled={loadingMoreCompleted}
                      style={({ pressed, hovered }) => [
                        styles.loadMoreBtn,
                        (hovered || pressed) && styles.loadMoreBtnPressed,
                        loadingMoreCompleted && styles.loadMoreBtnDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={strings.tasks.loadMoreCompleted}>
                      {loadingMoreCompleted ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.loadMoreText}>{strings.tasks.loadMore}</Text>
                      )}
                    </Pressable>
                  </View>
                ) : hasSearch && hasMoreCompleted ? (
                  <Text style={styles.searchHint}>
                    {strings.tasks.searchLoadedOnly}
                  </Text>
                ) : null
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
    footer: {
      paddingTop: 8,
      paddingBottom: 4,
      alignItems: 'center',
    },
    loadMoreBtn: {
      minWidth: 140,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    loadMoreBtnPressed: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
    loadMoreBtnDisabled: {
      opacity: 0.7,
    },
    loadMoreText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    searchHint: {
      marginTop: 8,
      marginBottom: 4,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '500',
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
  });
}
