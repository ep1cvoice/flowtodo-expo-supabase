import { strings } from '@/shared/lib/strings';
import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Calendar, CalendarDays } from 'lucide-react-native';
import type { CalendarViewMode } from '@/features/tasks/lib/useCalendarViewMode';
import type { AppColors } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';
import { webInteractive } from '@/shared/lib/pressableWeb';

interface CalendarViewToggleProps {
  mode: CalendarViewMode;
  onPress: () => void;
}

// Header button switching between the compact day strip and the full month calendar.
export default function CalendarViewToggle({ mode, onPress }: CalendarViewToggleProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isMonth = mode === 'month';
  const Icon = isMonth ? CalendarDays : Calendar;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed, hovered }) => [
        styles.btn,
        isMonth && styles.btnActive,
        (hovered || pressed) && styles.btnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={isMonth ? strings.tasks.switchToDayView : strings.tasks.switchToCalendarView}
      accessibilityState={{ selected: isMonth }}>
      <Icon size={16} color={isMonth ? colors.primary : colors.textSecondary} strokeWidth={2.2} />
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    btn: {
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      ...webInteractive,
    },
    btnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    btnPressed: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
  });
}
