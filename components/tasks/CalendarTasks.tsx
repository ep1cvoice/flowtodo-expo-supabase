import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  ScrollView,
  type GestureType,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type AnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import MonthGrid, { MonthWeekdayHeader } from '@/components/tasks/calendar/MonthGrid';
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
  focusWeekIndex,
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
  const panRef = useRef<GestureType | undefined>(undefined);
  const paging = useRef(false);
  const [pageWidth, setPageWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const expandedSv = useSharedValue(0);
  const expandedTarget = useSharedValue(0);
  const dragOrigin = useSharedValue(0);
  const panActivated = useSharedValue(false);
  const rowHeightSv = useSharedValue(0);
  const weekCountSv = useSharedValue(currentWeekCount);

  useLayoutEffect(() => {
    rowHeightSv.value = pageWidth > 0 ? pageWidth / 7 : 0;
    weekCountSv.value = currentWeekCount;
  }, [currentWeekCount, pageWidth, rowHeightSv, weekCountSv]);

  const frameStyle = useAnimatedStyle(() => ({
    height: monthFrameHeight(rowHeightSv.value, weekCountSv.value, expandedSv.value),
  }));

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withRef(panRef)
        .activeOffsetY([-10, 10])
        .failOffsetX([-16, 16])
        .onBegin(() => {
          dragOrigin.value = expandedSv.value;
          panActivated.value = false;
        })
        .onStart(() => {
          panActivated.value = true;
        })
        .onUpdate((event) => {
          const range = Math.max(rowHeightSv.value * (weekCountSv.value - 1), 1);
          expandedSv.value = clamp01(dragOrigin.value + event.translationY / range);
        })
        .onEnd((event, success) => {
          if (!success) return;
          const range = Math.max(rowHeightSv.value * (weekCountSv.value - 1), 1);
          const open = expandedSv.value + (event.velocityY / range) * 0.12 > 0.5;
          expandedTarget.value = open ? 1 : 0;
          expandedSv.value = withSpring(open ? 1 : 0, expandSpring(event.velocityY / range));
          runOnJS(setExpanded)(open);
        })
        .onFinalize((_event, success) => {
          if (success || !panActivated.value) return;
          panActivated.value = false;
          const open = expandedTarget.value > 0.5;
          expandedSv.value = withSpring(open ? 1 : 0, expandSpring());
          runOnJS(setExpanded)(open);
        }),
    [dragOrigin, expandedSv, expandedTarget, panActivated, rowHeightSv, weekCountSv]
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((open) => {
      const next = !open;
      expandedTarget.value = next ? 1 : 0;
      expandedSv.value = withSpring(next ? 1 : 0, expandSpring());
      return next;
    });
  }, [expandedSv, expandedTarget]);

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
          <GestureDetector gesture={pan}>
            <View>
              <Animated.View
                style={[styles.monthPager, frameStyle]}
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width;
                  if (nextWidth > 0) rowHeightSv.value = nextWidth / 7;
                  setPageWidth((current) => (current === nextWidth ? current : nextWidth));
                }}>
                {pageWidth > 0 ? (
                  <ScrollView
                    ref={monthScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    directionalLockEnabled
                    nestedScrollEnabled
                    waitFor={panRef}
                    style={{ width: pageWidth, flex: 1 }}
                    contentOffset={{ x: pageWidth, y: 0 }}
                    onMomentumScrollEnd={onMonthScrollEnd}
                    onScrollEndDrag={Platform.OS === 'web' ? onMonthScrollEnd : undefined}>
                    {monthPages.map((month) => (
                      <MonthPage
                        key={monthKey(month)}
                        month={month}
                        pageWidth={pageWidth}
                        frameStyle={frameStyle}
                        selectedDay={selectedDay}
                        today={today}
                        expanded={expanded}
                        expandedSv={expandedSv}
                        rowHeightSv={rowHeightSv}
                        dayTaskCounts={dayTaskCounts}
                        onPressDay={handleSelect}
                        styles={styles}
                      />
                    ))}
                  </ScrollView>
                ) : null}
              </Animated.View>
              <Pressable
                onPress={toggleExpanded}
                hitSlop={8}
                style={styles.handleHit}
                accessibilityRole="button"
                accessibilityLabel={expanded ? 'Show current week' : 'Show full month'}>
                <View style={styles.handlePill} />
              </Pressable>
            </View>
          </GestureDetector>
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
                <View style={styles.emptyIconRing}>
                  <View style={styles.emptyIcon}>
                    <CalendarPlus size={46} color={colors.primary} strokeWidth={2.2} />
                  </View>
                </View>
                <Text style={styles.emptyTitle}>There are no tasks on this day</Text>
                <Text style={styles.emptyText}>Create a new one or pick another day</Text>
              </View>
            }
          />
        )}
      </View>

    </View>
  );
}

function MonthPage({
  month,
  pageWidth,
  frameStyle,
  selectedDay,
  today,
  expanded,
  expandedSv,
  rowHeightSv,
  dayTaskCounts,
  onPressDay,
  styles,
}: {
  month: Date;
  pageWidth: number;
  frameStyle: AnimatedStyle<ViewStyle>;
  selectedDay: Date;
  today: Date;
  expanded: boolean;
  expandedSv: SharedValue<number>;
  rowHeightSv: SharedValue<number>;
  dayTaskCounts: Record<string, number>;
  onPressDay: (day: Date) => void;
  styles: CalendarStyles;
}) {
  const weeks = useMemo(() => buildMonthWeeks(month), [month]);
  const focusIndex = useMemo(() => focusWeekIndex(weeks, selectedDay), [weeks, selectedDay]);
  const focusSv = useSharedValue(focusIndex);
  const weekScrollRef = useAnimatedRef<Animated.ScrollView>();

  useLayoutEffect(() => {
    focusSv.value = focusIndex;
  }, [focusIndex, focusSv]);

  useAnimatedReaction(
    () => {
      const row = rowHeightSv.value;
      if (row <= 0) return -1;
      return focusSv.value * row * (1 - expandedSv.value);
    },
    (offset) => {
      if (offset < 0) return;
      scrollTo(weekScrollRef, 0, offset, false);
    }
  );

  return (
    <Animated.View style={[{ width: pageWidth }, frameStyle]}>
      <MonthWeekdayHeader variant="inline" />
      <Animated.ScrollView
        ref={weekScrollRef}
        scrollEnabled={false}
        disableScrollViewPanResponder
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        style={{ width: pageWidth, flex: 1 }}
        contentContainerStyle={{ width: pageWidth }}
        contentOffset={{
          x: 0,
          y: expanded ? 0 : focusIndex * (pageWidth / 7),
        }}>
        <MonthGrid
          weeks={weeks}
          variant="inline"
          showWeekdays={false}
          onPressDay={onPressDay}
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
      </Animated.ScrollView>
    </Animated.View>
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

function expandSpring(velocity = 0) {
  'worklet';
  return {
    damping: 22,
    stiffness: 260,
    mass: 0.65,
    overshootClamping: true,
    velocity,
  };
}

type CalendarStyles = ReturnType<typeof createStyles>;

function clamp01(value: number) {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

function monthFrameHeight(rowHeight: number, weekCount: number, expanded: number) {
  'worklet';
  const rows = 1 + (weekCount - 1) * expanded;
  return INLINE_WEEKDAY_HEIGHT + rowHeight * rows;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
    },
    monthShell: {
      marginHorizontal: -6,
      paddingTop: 8,
      paddingBottom: 4,
      gap: 2,
      backgroundColor: colors.bgSurface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderColor,
    },
    monthPager: {
      width: '100%',
      overflow: 'hidden',
    },
    handleHit: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 2,
      paddingBottom: 4,
    },
    handlePill: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textMuted,
      opacity: 0.45,
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
      gap: 8,
      paddingVertical: 28,
      paddingHorizontal: 24,
    },
    emptyIconRing: {
      marginBottom: 6,
      padding: 10,
      borderRadius: 999,
      borderWidth: 8,
      borderColor: colors.todoHighlight,
    },
    emptyIcon: {
      padding: 16,
      borderRadius: 999,
      backgroundColor: colors.primaryLight,
    },
    emptyTitle: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 16,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
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
