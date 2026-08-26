import { Pressable, Text } from 'react-native';
import type { TodoItemStyles } from '@/components/tasks/todoItemStyles';

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

interface DueDateBadgeProps {
  date: Date;
  isToday: boolean;
  isPast: boolean;
  compact?: boolean;
  showHover?: boolean;
  styles: TodoItemStyles;
  onPress: () => void;
}

export default function DueDateBadge({
  date,
  isToday,
  isPast,
  compact = false,
  showHover = false,
  styles,
  onPress,
}: DueDateBadgeProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.todoDate,
        isToday && styles.todoDateToday,
        isPast && styles.todoDatePast,
        showHover && hovered && styles.todoDateHovered,
        showHover && pressed && styles.controlPressed,
      ]}>
      <Text
        style={[
          styles.todoDateText,
          isToday && styles.todoDateTextToday,
          isPast && styles.todoDateTextPast,
        ]}
        numberOfLines={compact ? 1 : undefined}>
        {formatShortDate(date)}
      </Text>
    </Pressable>
  );
}
