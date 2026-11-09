import { useLayoutEffect, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useSharedValue,
  type AnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import MonthGrid, { MonthWeekdayHeader } from '@/features/tasks/components/calendar/MonthGrid';
import type { createCalendarTasksStyles } from '@/features/tasks/components/calendarTasksStyles';
import {
  buildMonthWeeks,
  focusWeekIndex,
  sameDay,
  toDayKey,
} from '@/features/tasks/lib/calendarDate';

export default function MonthPage({
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

export type CalendarStyles = ReturnType<typeof createCalendarTasksStyles>;
