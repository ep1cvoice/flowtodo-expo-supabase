import { strings } from '@/shared/lib/strings';
import { Pressable, Text, View } from 'react-native';
import { Calendar } from 'lucide-react-native';
import DueDateBadge from '@/features/tasks/components/item/DueDateBadge';
import { useTodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';

interface Props {
  dueDate: Date | null;
  // Without a date: whether to offer the calendar icon at all.
  showCalendarIcon: boolean;
  // Text shown next to the calendar icon while no date is set.
  label?: string;
  styles: TaskDetailStyles;
  onPress: () => void;
}

// First slot of the action bar: the due date badge, or a calendar icon to set one.
export default function TaskDateButton({
  dueDate,
  showCalendarIcon,
  label,
  styles,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { styles: todoStyles } = useTodoItemStyles();

  if (dueDate) {
    return (
      <View id="open-task-calendar">
        <DueDateBadge date={dueDate} styles={todoStyles} onPress={onPress} />
      </View>
    );
  }
  if (!showCalendarIcon) return null;

  return (
    <Pressable
      id="open-task-calendar"
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      hitSlop={4}
      style={({ pressed, hovered }) => [
        styles.iconBtn,
        label ? styles.labelBtn : null,
        (hovered || pressed) && styles.iconBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={strings.tasks.setDueDate}>
      <Calendar size={18} strokeWidth={2.2} color={colors.textSecondary} />
      {label ? <Text style={styles.labelBtnText}>{label}</Text> : null}
    </Pressable>
  );
}
