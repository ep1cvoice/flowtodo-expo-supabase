import { Pressable, Text } from 'react-native';
import { Calendar } from 'lucide-react-native';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import type { AppColors } from '@/constants/theme';

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

interface DueDateBadgeProps {
  date: Date;
  isToday: boolean;
  isPast: boolean;
  done?: boolean;
  colors: AppColors;
  styles: TodoItemStyles;
  onPress: () => void;
}

export default function DueDateBadge({
  date,
  isToday,
  isPast,
  done = false,
  colors,
  styles,
  onPress,
}: DueDateBadgeProps) {
  const iconColor = done
    ? colors.textMuted
    : isPast
      ? colors.red
      : isToday
        ? colors.primary
        : colors.textSecondary;

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => [styles.todoDate, pressed && styles.controlPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Due ${formatShortDate(date)}`}>
      <Calendar size={14} strokeWidth={2.2} color={iconColor} />
      <Text
        style={[
          styles.todoDateText,
          isToday && !done && styles.todoDateTextToday,
          isPast && !done && styles.todoDateTextPast,
          done && styles.todoDateTextCompleted,
        ]}>
        {formatShortDate(date)}
      </Text>
    </Pressable>
  );
}
