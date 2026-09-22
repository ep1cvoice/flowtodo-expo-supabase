import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import MonthGrid from '@/components/tasks/calendar/MonthGrid';
import ToDoItem from '@/components/tasks/item/ToDoItem';
import { CREATE_TASK_FAB_CLEARANCE } from '@/components/tasks/form/CreateTaskButton';
import type { AppColors } from '@/constants/theme';
import { useCreateTask } from '@/context/CreateTaskContext';
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const { activeTasks, loading, toggleTask, deleteTask } = useTasks();
  const { setScheduledDay } = useCreateTask();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDay, setSelectedDay] = useState<Date>(() => today);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  useEffect(() => {
    setScheduledDay('calendar', selectedDay);
  }, [selectedDay, setScheduledDay]);

  const dayTaskCounts = useMemo(() => collectDayTaskCounts(activeTasks), [activeTasks]);
  const monthPages = useMemo(
    () => [shiftMonth(monthCursor, -1), monthCursor, shiftMonth(monthCursor, 1)],
    [monthCursor]
  );
  const currentWeekCount = useMemo(() => buildMonthWeeks(monthCursor).length, [monthCursor]);
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
      <View style={styles.monthShell}>
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
          <View
            style={[
              styles.monthPager,
              pageWidth > 0 && {
                height: INLINE_WEEKDAY_HEIGHT + currentWeekCount * (pageWidth / 7),
              },
            ]}
            onLayout={(event) => {
              const nextWidth = event.nativeEvent.layout.width;
              setPageWidth((current) => (current === nextWidth ? current : nextWidth));
            }}>
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
                    weeks={buildMonthWeeks(month)}
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
      </View>

      <View style={styles.listInset}>
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

    </View>
  );
}

function shiftMonth(month: Date, delta: number) {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1);
}

function monthKey(month: Date) {
  return `${month.getFullYear()}-${month.getMonth()}`;
}

/** Matches MonthGrid inline weekday: paddingVertical 4 + lineHeight 14. */
const INLINE_WEEKDAY_HEIGHT = 22;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
    },
    monthShell: {
      marginHorizontal: -6,
      paddingTop: 8,
      paddingBottom: 12,
      gap: 2,
      backgroundColor: colors.bgSurface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderColor,
    },
    monthPager: {
      width: '100%',
      overflow: 'hidden',
    },
    listInset: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: TASK_LIST_INSET,
      paddingTop: 12,
    },
    monthNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: 8,
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
