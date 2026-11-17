import { strings } from '@/shared/lib/strings';
import { Pressable } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import type { TodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import type { AppColors } from '@/shared/constants/theme';

interface TaskMobileTrailingProps {
  done: boolean;
  colors: AppColors;
  styles: TodoItemStyles;
  onDelete: () => void;
}

export default function TaskMobileTrailing({
  done,
  colors,
  styles,
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
        accessibilityLabel={strings.tasks.deleteTask}>
        <Trash2 size={18} strokeWidth={2.2} color={colors.textPrimary} />
      </Pressable>
    );
  }

  return null;
}
