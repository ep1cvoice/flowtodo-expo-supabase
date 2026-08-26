import { Pressable, View } from 'react-native';
import { CirclePlus, Trash2, type LucideIcon } from 'lucide-react-native';
import DueDateBadge from '@/components/tasks/item/DueDateBadge';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import type { AppColors } from '@/constants/theme';
import type { Category } from '@/types';

interface TaskMobileTrailingProps {
  done: boolean;
  dueDate: Date | null;
  isToday: boolean;
  isPast: boolean;
  category: Category | null;
  CategoryIconComp: LucideIcon | null;
  colors: AppColors;
  styles: TodoItemStyles;
  onOpenCalendar: () => void;
  onOpenActions: () => void;
  onDelete: () => void;
}

export default function TaskMobileTrailing({
  done,
  dueDate,
  isToday,
  isPast,
  category,
  CategoryIconComp,
  colors,
  styles,
  onOpenCalendar,
  onOpenActions,
  onDelete,
}: TaskMobileTrailingProps) {
  return (
    <View style={styles.mobileRight}>
      {!done && dueDate ? (
        <DueDateBadge
          date={dueDate}
          isToday={isToday}
          isPast={isPast}
          compact
          styles={styles}
          onPress={onOpenCalendar}
        />
      ) : null}
      {CategoryIconComp && category ? (
        <View
          style={styles.categoryMark}
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants">
          <CategoryIconComp size={20} strokeWidth={2} color={category.color} />
        </View>
      ) : null}
      {!done ? (
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
      ) : (
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
      )}
    </View>
  );
}
