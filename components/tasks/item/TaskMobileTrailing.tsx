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
      {CategoryIconComp && category && (
        <View style={{ opacity: 0.5 }}>
          <CategoryIconComp size={20} strokeWidth={1.5} color={category.color} />
        </View>
      )}
      {!done ? (
        <Pressable style={styles.mobilePlus} onPress={onOpenActions} hitSlop={8}>
          <CirclePlus size={20} color={colors.textPrimary} />
        </Pressable>
      ) : (
        <Pressable style={styles.mobilePlus} onPress={onDelete} hitSlop={8}>
          <Trash2 size={20} color={colors.textPrimary} />
        </Pressable>
      )}
    </View>
  );
}
