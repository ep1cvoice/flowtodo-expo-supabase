import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import MonthPage from '@/features/tasks/components/calendar/MonthPage';
import ToDoItem from '@/features/tasks/components/item/ToDoItem';
import { createCalendarTasksStyles } from '@/features/tasks/components/calendarTasksStyles';
import { useCreateTask } from '@/features/tasks/CreateTaskContext';
import { useTasks } from '@/features/tasks/TasksContext';
import { useCalendarExpandGesture } from '@/features/tasks/lib/useCalendarExpandGesture';
import { useTaskActions } from '@/features/tasks/lib/useTaskActions';
import { useTheme } from '@/shared/providers/ThemeContext';
import {
  buildMonthWeeks,
  collectDayTaskCounts,
  startOfDay,
  taskMatchesScheduledDay,
} from '@/features/tasks/lib/calendarDate';
import type { Task } from '@/types';

export default function CalendarTasks() {
  const { colors } = useTheme();
  const styles = useMemo(() => createCalendarTasksStyles(colors), [colors]);
  const { activeTasks, loading } = useTasks();
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
  const { pan, panRef, expanded, expandedSv, rowHeightSv, frameStyle, toggleExpanded } =
    useCalendarExpandGesture(pageWidth, currentWeekCount);

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

  const { handleToggle, handleDelete } = useTaskActions();

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

function shiftMonth(month: Date, delta: number) {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1);
}

function monthKey(month: Date) {
  return `${month.getFullYear()}-${month.getMonth()}`;
}
