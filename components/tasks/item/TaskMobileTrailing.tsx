import { Pressable } from 'react-native';
import { CirclePlus, Trash2 } from 'lucide-react-native';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import type { AppColors } from '@/constants/theme';

interface TaskMobileTrailingProps {
  done: boolean;
  colors: AppColors;
  styles: TodoItemStyles;
  onOpenActions: () => void;
  onDelete: () => void;
}

export default function TaskMobileTrailing({
  done,
  colors,
  styles,
  onOpenActions,
  onDelete,
}: TaskMobileTrailingProps) {
  if (done) {
    return (
      <Pressable
        style={styles.mobilePlus}
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Delete task">
        <Trash2 size={18} strokeWidth={2.2} color={colors.textPrimary} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.mobilePlus, styles.iconTile]}
      onPress={(e) => {
        e.stopPropagation();
        onOpenActions();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Task actions">
      <CirclePlus size={18} strokeWidth={2.2} color={colors.primary} />
    </Pressable>
  );
}
