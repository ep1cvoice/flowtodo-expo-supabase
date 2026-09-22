import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import MonthGrid from '@/components/tasks/calendar/MonthGrid';
import ToDoItem from '@/components/tasks/item/ToDoItem';
import AddTaskModal from '@/components/tasks/form/AddTaskModal';
import CreateTaskButton, {
  CREATE_TASK_FAB_CLEARANCE,
} from '@/components/tasks/form/CreateTaskButton';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import {
  buildMonthWeeks,
  collectDayTaskCounts,
  sameDay,
  startOfDay,
  taskMatchesScheduledDay,
  toDayKey,
} from '@/lib/calendar/calendarDate';
import { toastForError } from '@/lib/networkError';
import { TASK_LIST_INSET } from '@/components/tasks/filters/TaskSearchBar';
import { webInteractive } from '@/utils/pressableWeb';
import type { Task } from '@/types';

export default function CalendarTasks() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= tokens.desktopBreakpoint;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDesktop), [colors, isDesktop]);
  const { showToast } = useToast();
  const { activeTasks, categories, tags, loading, addTask, toggleTask, deleteTask } = useTasks();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDay, setSelectedDay] = useState<Date>(() => today);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

  const dayTaskCounts = useMemo(() => collectDayTaskCounts(activeTasks), [activeTasks]);
  const monthPages = useMemo(
    () => [shiftMonth(monthCursor, -1), monthCursor, shiftMonth(monthCursor, 1)],
    [monthCursor]
  );
  const monthLabel = monthCursor.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const monthScrollRef = useRef<ScrollView>(null);
  const paging = useRef(false);
  const [pageWidth, setPageWidth] = useState(0);

  useLayoutEffect(() => {
    if (pageWidth <= 0) return;
    monthScrollRef.current?.scrollTo({ x: pageWidth, animated: false });
    paging.current = false;
  }, [monthCursor, pageWidth]);

  const onMonthScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (paging.current || pageWidth <= 0) return;
    const page = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (page !== 0 && page !== 2) return;
    paging.current = true;
    setMonthCursor((current) => shiftMonth(current, page - 1));
  };
  const dayTasks = useMemo(
    () => activeTasks.filter((task) => taskMatchesScheduledDay(task, selectedDay)),
    [activeTasks, selectedDay]
  );


  const handleSelect = (day: Date) => {
    const next = startOfDay(day);
    setSelectedDay(next);
    setMonthCursor(new Date(next.getFullYear(), next.getMonth(), 1));
  };

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

  const renderTask = useCallback(
    ({ item, index }: { item: Task; index: number }) => (
      <View style={styles.itemWrap}>
        <ToDoItem task={item} index={index} onToggle={handleToggle} onDelete={handleDelete} />
      </View>
    ),
    [handleDelete, handleToggle, styles.itemWrap]
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentInset}>
        <View
          style={styles.monthPanel}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            setPageWidth((current) => (current === nextWidth ? current : nextWidth));
          }}>
          <View style={styles.monthNavRow}>
            <Pressable
              onPress={() => setMonthCursor((current) => shiftMonth(current, -1))}
              hitSlop={8}
              style={({ pressed, hovered }) => [
                styles.navBtn,
                (hovered || pressed) && styles.navBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous month">
              <ChevronLeft size={18} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.monthLabel} numberOfLines={1}>
              {monthLabel}
            </Text>
            <Pressable
              onPress={() => setMonthCursor((current) => shiftMonth(current, 1))}
              hitSlop={8}
              style={({ pressed, hovered }) => [
                styles.navBtn,
                (hovered || pressed) && styles.navBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next month">
              <ChevronRight size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
          {pageWidth > 0 ? (
            <ScrollView
              ref={monthScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              nestedScrollEnabled
              style={{ width: pageWidth }}
              contentOffset={{ x: pageWidth, y: 0 }}
              onMomentumScrollEnd={onMonthScrollEnd}
              onScrollEndDrag={Platform.OS === 'web' ? onMonthScrollEnd : undefined}>
              {monthPages.map((month) => (
                <View key={monthKey(month)} style={{ width: pageWidth }}>
                  <MonthGrid
                    weeks={buildMonthWeeks(month, 6)}
                    variant="inline"
                    onPressDay={handleSelect}
                    dayState={(day) => ({
                      selected: sameDay(day, selectedDay),
                      today: sameDay(day, today),
                      muted: day.getMonth() !== month.getMonth(),
                    })}
                    renderExtra={(day, state) => {
                      const marked = (dayTaskCounts[toDayKey(day)] ?? 0) > 0;
                      return (
                        <View
                          style={[
                            styles.dot,
                            marked ? styles.dotMarked : styles.dotEmpty,
                            state.selected && marked && styles.dotOnSelected,
                          ]}
                        />
                      );
                    }}
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>


        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading tasks…</Text>
          </View>
        ) : (
          <FlatList
            style={styles.tasksList}
            contentContainerStyle={[
              styles.tasksContent,
              dayTasks.length === 0 && styles.tasksContentEmpty,
            ]}
            data={dayTasks}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderTask}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No tasks on this day</Text>
                <Text style={styles.emptyText}>Create a task or pick another day</Text>
              </View>
            }
          />
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
    </View>
  );
}

function shiftMonth(month: Date, delta: number) {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1);
}

function monthKey(month: Date) {
  return `${month.getFullYear()}-${month.getMonth()}`;
}

function createStyles(colors: AppColors, isDesktop: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
    },
    contentInset: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: TASK_LIST_INSET,
      paddingTop: TASK_LIST_INSET,
    },
    monthPanel: {
      paddingTop: 10,
      gap: 4,
      ...(isDesktop
        ? {
            maxWidth: 420,
            width: '100%',
            alignSelf: 'center',
          }
        : null),
    },
    monthNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    navBtn: {
      padding: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    navBtnPressed: {
      backgroundColor: colors.todoHighlight,
    },
    monthLabel: {
      flexShrink: 1,
      minWidth: 140,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    dot: {
      position: 'absolute',
      bottom: 3,
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    dotMarked: {
      backgroundColor: colors.primary,
    },
    dotEmpty: {
      backgroundColor: 'transparent',
    },
    dotOnSelected: {
      backgroundColor: '#fff',
    },
    dayLabel: {
      marginTop: 14,
      marginBottom: 8,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    tasksList: {
      flex: 1,
      minHeight: 0,
    },
    tasksContent: {
      flexGrow: 1,
      paddingBottom: CREATE_TASK_FAB_CLEARANCE,
    },
    tasksContentEmpty: {
      justifyContent: 'center',
    },
    itemWrap: {
      width: '100%',
    },
    empty: {
      alignItems: 'center',
      gap: 4,
      paddingVertical: 24,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
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
