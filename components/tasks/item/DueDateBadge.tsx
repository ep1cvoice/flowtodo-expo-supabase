import { Pressable, Text } from 'react-native';
import { Calendar } from 'lucide-react-native';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';

const DATE_BLUE = '#3b82f6';

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

interface DueDateBadgeProps {
  date: Date;
  styles: TodoItemStyles;
  onPress: () => void;
}

export default function DueDateBadge({
  date,
  styles,
  onPress,
}: DueDateBadgeProps) {
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
      <Calendar size={14} strokeWidth={2.2} color={DATE_BLUE} />
      <Text style={styles.todoDateText}>{formatShortDate(date)}</Text>
    </Pressable>
  );
}
