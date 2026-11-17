import { strings } from '@/shared/lib/strings';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
// RNGH 3's new ScrollView dropped `waitFor`; the legacy one keeps it, which the pan gesture needs.
import { GestureDetector, LegacyScrollView as ScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import MonthPage from '@/features/tasks/components/calendar/MonthPage';
import { createCalendarTasksStyles } from '@/features/tasks/components/calendarTasksStyles';
import { useCalendarExpandGesture } from '@/features/tasks/lib/useCalendarExpandGesture';
import { useTheme } from '@/shared/providers/ThemeContext';
import {
  buildMonthWeeks,
  formatMonthLabel,
  sameDay,
  startOfDay,
} from '@/features/tasks/lib/calendarDate';
import { isWeb } from '@/shared/lib/platform';

interface MonthCalendarProps {
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
  dayTaskCounts: Record<string, number>;
}

// Swipeable month calendar (collapsible to one week) used as the full calendar view.
export default function MonthCalendar({
  selectedDay,
  onSelectDay,
  dayTaskCounts,
}: MonthCalendarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createCalendarTasksStyles(colors), [colors]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const focusDay = selectedDay ?? today;
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(focusDay.getFullYear(), focusDay.getMonth(), 1)
  );
  const monthPages = useMemo(
    () => [shiftMonth(monthCursor, -1), monthCursor, shiftMonth(monthCursor, 1)],
    [monthCursor]
  );
  const currentWeekCount = useMemo(() => buildMonthWeeks(monthCursor).length, [monthCursor]);
  const monthLabel = formatMonthLabel(monthCursor);
  const monthScrollRef = useRef<ScrollViewInstance>(null);
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

  const handleSelect = (day: Date) => {
    if (selectedDay && sameDay(day, selectedDay)) {
      onSelectDay(null);
      return;
    }
    const next = startOfDay(day);
    onSelectDay(next);
    setMonthCursor(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  return (
    <View style={[styles.monthShell, styles.monthShellInset]}>
        <View style={styles.monthNavRow}>
          <Pressable
            onPress={() => setMonthCursor((current) => shiftMonth(current, -1))}
            hitSlop={8}
            style={({ pressed, hovered }) => [
              styles.navBtn,
              (hovered || pressed) && styles.navBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={strings.tasks.previousMonth}>
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
            accessibilityLabel={strings.tasks.nextMonth}>
            <ChevronRight size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
        <GestureDetector gesture={pan}>
          <View>
            <Animated.View
              style={[styles.monthPager, frameStyle]}
              onLayout={(event) => {
                const nextWidth = event.nativeEvent.layout.width;
                if (nextWidth > 0) rowHeightSv.set(nextWidth / 7);
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
                  onScrollEndDrag={isWeb ? onMonthScrollEnd : undefined}>
                  {monthPages.map((month) => (
                    <MonthPage
                      key={monthKey(month)}
                      month={month}
                      pageWidth={pageWidth}
                      frameStyle={frameStyle}
                      selectedDay={selectedDay}
                        focusDay={focusDay}
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
              accessibilityLabel={expanded ? strings.tasks.showCurrentWeek : strings.tasks.showFullMonth}>
              <View style={styles.handlePill} />
            </Pressable>
          </View>
        </GestureDetector>
    </View>
  );
}

function shiftMonth(month: Date, delta: number) {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1);
}

function monthKey(month: Date) {
  return `${month.getFullYear()}-${month.getMonth()}`;
}
