import { Pressable, Text } from 'react-native';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';

interface TaskCheckboxProps {
  done: boolean;
  styles: TodoItemStyles;
  onPress: () => void;
}

export default function TaskCheckbox({ done, styles, onPress }: TaskCheckboxProps) {
  return (
    <Pressable
      style={({ pressed, hovered }) => [
        styles.todoCheckbox,
        done && styles.checked,
        hovered && !done && styles.checkboxHovered,
        hovered && done && styles.checkboxCheckedHovered,
        pressed && styles.controlPressed,
      ]}
      onPress={onPress}
      hitSlop={6}>
      {done ? <Text style={styles.checkmark}>✓</Text> : null}
    </Pressable>
  );
}
