import { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { buildDayStrip, sameDay, startOfDay, toDayKey } from '@/lib/calendar/calendarDate';
import { webInteractive } from '@/utils/pressableWeb';

const STRIP_DAY_WIDTH = 46;
const STRIP_DAY_HEIGHT = 68;
const STRIP_DAY_GAP = 6;
const STRIP_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface ActiveDayCalendarProps {
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
  dayTaskCounts: Record<string, number>;
}

export default function ActiveDayCalendar({
  selectedDay,
  onSelectDay,
  dayTaskCounts,
}: ActiveDayCalendarProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= tokens.desktopBreakpoint;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const stripDays = useMemo(() => buildDayStrip(today), [today]);
  const stripRef = useRef<ScrollView>(null);
  const todayOffset = useMemo(() => {
    const todayIndex = stripDays.findIndex((day) => sameDay(day, today));
    return Math.max(0, todayIndex) * (STRIP_DAY_WIDTH + STRIP_DAY_GAP);
  }, [stripDays, today]);

  useEffect(() => {
    if (isDesktop) return;
    const id = requestAnimationFrame(() => {
      stripRef.current?.scrollTo({ x: todayOffset, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [isDesktop, todayOffset]);

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
    const isPast = day.getTime() < today.getTime();
    const count = dayTaskCounts[key] ?? 0;
    const taskLabel = count === 1 ? '1 task' : `${count} tasks`;
    return (
      <Pressable
        key={key}
        onPress={() => handleSelect(day)}
        style={({ pressed, hovered }) => [
          styles.stripDay,
          isDesktop && styles.stripDayDesktop,
          isPast && !selected && styles.stripDayPast,
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

  const allChip = (
    <Pressable
      onPress={() => onSelectDay(null)}
      style={({ pressed, hovered }) => [
        styles.stripDay,
        styles.allChip,
        isDesktop && styles.stripDayDesktop,
        !selectedDay && styles.allChipActive,
        (hovered || pressed) && styles.stripDayPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Show all days"
      accessibilityState={{ selected: !selectedDay }}>
      <Text style={[styles.allChipText, !selectedDay && styles.allChipTextActive]}>All</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      {isDesktop ? (
        <View style={styles.stripDesktopRow}>
          {allChip}
          {stripDays.map(renderStripDay)}
        </View>
      ) : (
        <View style={styles.mobileRow}>
          {allChip}
          <ScrollView
            ref={stripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripContent}
            contentOffset={{ x: todayOffset, y: 0 }}
            style={styles.strip}>
            {stripDays.map(renderStripDay)}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 8,
      zIndex: 2,
    },
    mobileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: STRIP_DAY_GAP,
    },
    strip: {
      flex: 1,
    },
    stripDesktopRow: {
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
      height: STRIP_DAY_HEIGHT,
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
    stripDayPast: {
      opacity: 0.55,
    },
    stripDaySelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
      opacity: 1,
    },
    stripDayToday: {
      borderColor: colors.primary,
    },
    stripDayPressed: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
    allChip: {
      paddingHorizontal: 4,
    },
    allChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    allChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    allChipTextActive: {
      color: colors.primary,
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
  });
}
