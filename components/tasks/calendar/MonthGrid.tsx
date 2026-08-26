import { type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { WEEKDAY_LABELS } from '@/lib/calendar/calendarDate';
import { webInteractive } from '@/utils/pressableWeb';

export type MonthGridDayState = {
  selected: boolean;
  today: boolean;
  disabled?: boolean;
  muted?: boolean;
};

interface MonthGridProps {
  weeks: (Date | null)[][];
  variant: 'modal' | 'inline';
  onPressDay: (day: Date) => void;
  dayState: (day: Date) => MonthGridDayState;
  renderExtra?: (day: Date, state: MonthGridDayState) => ReactNode;
}

export default function MonthGrid({
  weeks,
  variant,
  onPressDay,
  dayState,
  renderExtra,
}: MonthGridProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, variant), [colors, variant]);

  return (
    <>
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((d) => (
          <View key={d} style={styles.weekdayCell}>
            <Text style={styles.weekday}>{d}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={`w-${wi}`} style={styles.weekRow}>
          {week.map((day, di) => {
            if (!day) {
              return <View key={`e-${wi}-${di}`} style={styles.cell} />;
            }

            const state = dayState(day);
            return (
              <Pressable
                key={day.toISOString()}
                disabled={!!state.disabled}
                onPress={() => onPressDay(day)}
                style={styles.cell}
                {...(variant === 'inline'
                  ? {
                      accessibilityRole: 'button' as const,
                      accessibilityLabel: day.toDateString(),
                      accessibilityState: { selected: state.selected },
                    }
                  : {})}>
                {({ pressed, hovered }) =>
                  renderDayInner(
                    day,
                    state,
                    styles,
                    renderExtra,
                    !state.selected && !state.disabled && (hovered || pressed)
                  )
                }
              </Pressable>
            );
          })}
        </View>
      ))}
    </>
  );
}

function renderDayInner(
  day: Date,
  state: MonthGridDayState,
  styles: ReturnType<typeof createStyles>,
  renderExtra: ((day: Date, state: MonthGridDayState) => ReactNode) | undefined,
  hovered: boolean
) {
  return (
    <View
      style={[
        styles.dayInner,
        state.selected && styles.daySelected,
        state.today && !state.selected && styles.dayToday,
        state.disabled && styles.dayDisabled,
        hovered && styles.dayHovered,
      ]}>
      <Text
        style={[
          styles.dayText,
          state.muted && styles.dayTextMuted,
          state.selected && styles.dayTextSelected,
          state.disabled && styles.dayTextDisabled,
        ]}>
        {day.getDate()}
      </Text>
      {renderExtra?.(day, state)}
    </View>
  );
}

function createStyles(colors: AppColors, variant: 'modal' | 'inline') {
  const compact = variant === 'inline';
  return StyleSheet.create({
    weekRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: compact ? undefined : 'center',
      paddingVertical: compact ? 4 : 6,
    },
    weekday: {
      textAlign: compact ? undefined : 'center',
      fontSize: compact ? 11 : 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    cell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    dayInner: {
      width: compact ? 34 : 36,
      height: compact ? 34 : 36,
      borderRadius: compact ? 17 : 18,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    dayHovered: {
      backgroundColor: colors.bgCardHover,
    },
    daySelected: {
      backgroundColor: colors.primary,
    },
    dayToday: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    dayDisabled: {
      opacity: 0.35,
    },
    dayText: {
      fontSize: compact ? 13 : 14,
      fontWeight: compact ? '600' : '400',
      color: colors.textPrimary,
    },
    dayTextMuted: {
      color: colors.textMuted,
      fontWeight: '500',
    },
    dayTextSelected: {
      color: '#fff',
      fontWeight: '700',
    },
    dayTextDisabled: {
      color: colors.textMuted,
    },
  });
}
