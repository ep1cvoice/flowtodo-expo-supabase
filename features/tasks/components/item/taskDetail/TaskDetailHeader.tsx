import { Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { getCategoryIcon } from '@/shared/constants/categoryIcons';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { Task } from '@/types';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import { tagTint } from '@/features/tasks/components/item/taskDetail/taskDetailUtils';

interface Props {
  task: Task;
  styles: TaskDetailStyles;
  onClose: () => void;
  onPressOutside: () => void;
}

export default function TaskDetailHeader({ task, styles, onClose, onPressOutside }: Props) {
  const { colors } = useTheme();
  const category = task.category;
  const CategoryIcon = category ? getCategoryIcon(category.icon) : null;

  return (
    <Pressable
      accessible={false}
      onPress={onPressOutside}
      style={[styles.header, category ? { backgroundColor: tagTint(category.color, 0.3) } : null]}>
      {CategoryIcon && category ? (
        <CategoryIcon size={22} strokeWidth={2} color={category.color} />
      ) : null}
      <View style={styles.titleWrap}>
        <Text style={[styles.title, task.done && styles.done]}>{task.title}</Text>
      </View>
      <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel="Close">
        <X size={20} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}
