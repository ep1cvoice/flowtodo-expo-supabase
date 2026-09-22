import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react-native';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import {
  WEEKDAY_LABELS,
  buildDayStrip,
  buildMonthWeeks,
  sameDay,
  startOfDay,
  toDayKey,
} from '@/lib/calendar/calendarDate';
import MonthGrid from '@/components/tasks/calendar/MonthGrid';
import { webInteractive } from '@/utils/pressableWeb';

const STRIP_DAY_WIDTH = 46;
const STRIP_DAY_GAP = 6;
const STRIP_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface ActiveDayCalendarProps {
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
  markedDays: Set<string>;
  dayTaskCounts: Record<string, number>;
}

export default function ActiveDayCalendar({
  selectedDay,
  onSelectDay,
  markedDays,
  dayTaskCounts,
}: ActiveDayCalendarProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= tokens.desktopBreakpoint;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDesktop), [colors, isDesktop]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const stripDays = useMemo(() => buildDayStrip(today), [today]);
  const stripRef = useRef<ScrollView>(null);
  const [expanded, setExpanded] = useState(false);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  useEffect(() => {
    if (expanded || isDesktop) return;
    const id = requestAnimationFrame(() => {
      stripRef.current?.scrollTo({
        x: Math.max(0, 6 * (STRIP_DAY_WIDTH + STRIP_DAY_GAP) - 28),
        animated: false,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [expanded, isDesktop]);

  useEffect(() => {
    if (!selectedDay) return;
    setMonthCursor(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1));
  }, [selectedDay]);

  const weeks = useMemo(() => buildMonthWeeks(monthCursor), [monthCursor]);
  const monthLabel = monthCursor.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleSelect = (day: Date) => {
    if (selectedDay && sameDay(day, selectedDay)) {
      onSelectDay(null);
      return;
    }
    onSelectDay(startOfDay(day));
  };

  const renderStripDay = (day: Date) => {
    const key = toDayKey(day);
    const selected = selectedDay ? sameDay(day, selectedDay) : false;
    const isToday = sameDay(day, today);
    const count = dayTaskCounts[key] ?? 0;
    const taskLabel = count === 1 ? '1 task' : `${count} tasks`;
    return (
      <Pressable
        key={key}
        onPress={() => handleSelect(day)}
        style={({ pressed, hovered }) => [
          styles.stripDay,
          isDesktop && styles.stripDayDesktop,
          selected && styles.stripDaySelected,
          isToday && !selected && styles.stripDayToday,
          (hovered || pressed) && !selected && styles.stripDayPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${day.toDateString()}, ${taskLabel}`}
        accessibilityState={{ selected }}>
        <Text
          style={[
            styles.stripWeekday,
            selected && styles.stripTextSelected,
            isToday && !selected && styles.stripTodayAccent,
          ]}>
          {STRIP_WEEKDAYS[day.getDay()]}
        </Text>
        <Text
          style={[
            styles.stripDate,
            selected && styles.stripTextSelected,
            isToday && !selected && styles.stripTodayAccent,
          ]}>
          {day.getDate()}
        </Text>
        <Text
          style={[
            styles.stripCount,
            count === 0 && styles.stripCountEmpty,
            selected && styles.stripTextSelected,
          ]}>
          {count}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.topRow,
          isDesktop && styles.topRowDesktop,
          isDesktop && expanded && styles.topRowDesktopExpanded,
        ]}>
        <Pressable
          onPress={() => onSelectDay(null)}
          style={({ pressed, hovered }) => [
            styles.allChip,
            !selectedDay && styles.allChipActive,
            (hovered || pressed) && styles.allChipPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Show all days"
          accessibilityState={{ selected: !selectedDay }}>
          <Text style={[styles.allChipText, !selectedDay && styles.allChipTextActive]}>All</Text>
        </Pressable>

        {!expanded ? (
          isDesktop ? (
            <View style={styles.stripDesktopRow}>{stripDays.map(renderStripDay)}</View>
          ) : (
            <ScrollView
              ref={stripRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stripContent}
              style={styles.strip}>
              {stripDays.map(renderStripDay)}
            </ScrollView>
          )
        ) : (
          <View style={styles.monthNavRow}>
            <Pressable
              onPress={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
              }
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
              onPress={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
              }
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
        )}

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={({ pressed, hovered }) => [
            styles.expandBtn,
            (hovered || pressed) && styles.expandBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse calendar' : 'Expand calendar'}
          accessibilityState={{ expanded }}>
          {expanded ? (
            <ChevronUp size={18} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={colors.textSecondary} />
          )}
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.monthPanel}>
          <MonthGrid
            weeks={weeks}
            variant="inline"
            onPressDay={handleSelect}
            dayState={(day) => ({
              selected: selectedDay ? sameDay(day, selectedDay) : false,
              today: sameDay(day, today),
              muted: day.getMonth() !== monthCursor.getMonth(),
            })}
            renderExtra={(day, state) => {
              const marked = markedDays.has(toDayKey(day));
              return (
                <View
                  style={[
                    styles.dot,
                    styles.monthDot,
                    marked ? styles.dotMarked : styles.dotEmpty,
                    state.selected && marked && styles.dotOnSelected,
                  ]}
                />
              );
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors, isDesktop: boolean) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 8,
      gap: 8,
      zIndex: 2,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 36,
    },
    topRowDesktop: {
      width: '100%',
      alignSelf: 'center',
    },
    topRowDesktopExpanded: {
      maxWidth: 380,
    },
    monthNavRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    allChip: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      minHeight: 36,
      justifyContent: 'center',
      ...webInteractive,
    },
    allChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    allChipPressed: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
    allChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    allChipTextActive: {
      color: colors.primary,
    },
    strip: {
      flex: 1,
    },
    stripDesktopRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    stripContent: {
      gap: STRIP_DAY_GAP,
      alignItems: 'center',
      paddingRight: 4,
    },
    stripDay: {
      width: STRIP_DAY_WIDTH,
      height: 68,
      paddingVertical: 6,
      paddingHorizontal: 2,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      ...webInteractive,
    },
    stripDayDesktop: {
      flex: 1,
      width: undefined,
      minWidth: 0,
    },
    stripDaySelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    stripDayToday: {
      borderColor: colors.primary,
    },
    stripDayPressed: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
    stripWeekday: {
      fontSize: 10,
      fontWeight: '600',
      lineHeight: 12,
      color: colors.textMuted,
    },
    stripDate: {
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 22,
      color: colors.textPrimary,
    },
    stripCount: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 14,
      color: colors.textSecondary,
    },
    stripCountEmpty: {
      color: colors.textMuted,
    },
    stripTextSelected: {
      color: '#fff',
    },
    stripTodayAccent: {
      color: colors.primary,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 1,
    },
    monthDot: {
      position: 'absolute',
      bottom: 3,
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
    expandBtn: {
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      minHeight: 36,
      minWidth: 36,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    expandBtnPressed: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
    monthPanel: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      padding: 10,
      gap: 4,
      ...(isDesktop
        ? {
            maxWidth: 380,
            width: '100%',
            alignSelf: 'center',
          }
        : null),
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
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
  });
}
