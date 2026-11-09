import { strings } from '@/shared/lib/strings';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import type { AppColors } from '@/shared/constants/theme';
import type { TodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';

interface TaskReorderButtonsProps {
  canMoveUp: boolean;
  canMoveDown: boolean;
  colors: AppColors;
  styles: TodoItemStyles;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function TaskReorderButtons({
  canMoveUp,
  canMoveDown,
  colors,
  styles,
  onMoveUp,
  onMoveDown,
}: TaskReorderButtonsProps) {
  return (
    <View style={styles.reorderButtons}>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onMoveUp?.();
        }}
        disabled={!canMoveUp}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={strings.tasks.moveUp}
        style={({ pressed, hovered }) => [
          styles.reorderBtn,
          !canMoveUp && styles.reorderBtnDisabled,
          canMoveUp && (hovered || pressed) && styles.reorderBtnPressed,
        ]}>
        <ChevronUp
          size={16}
          color={canMoveUp ? colors.textSecondary : colors.textMuted}
          strokeWidth={2.4}
        />
      </Pressable>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onMoveDown?.();
        }}
        disabled={!canMoveDown}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={strings.tasks.moveDown}
        style={({ pressed, hovered }) => [
          styles.reorderBtn,
          !canMoveDown && styles.reorderBtnDisabled,
          canMoveDown && (hovered || pressed) && styles.reorderBtnPressed,
        ]}>
        <ChevronDown
          size={16}
          color={canMoveDown ? colors.textSecondary : colors.textMuted}
          strokeWidth={2.4}
        />
      </Pressable>
    </View>
  );
}
