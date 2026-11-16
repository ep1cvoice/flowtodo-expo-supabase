import { strings } from '@/shared/lib/strings';
import { Pressable, Text } from 'react-native';
import { ChevronDown, CircleDashed, X } from 'lucide-react-native';
import CategoryIconGlyph from '@/shared/ui/CategoryIconGlyph';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { Category } from '@/types';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import { tagTint } from '@/features/tasks/components/item/taskDetail/taskDetailUtils';

interface Props {
  category: Category | null;
  styles: TaskDetailStyles;
  onClose: () => void;
  onPressOutside: () => void;
  onOpenCategory: () => void;
  // Chip text while no category is set.
  placeholder?: string;
}

// Top bar of the task sheets (detail and create): the category dropdown chip on the left,
// close on the right.
export default function TaskDetailHeader({
  category,
  styles,
  onClose,
  onPressOutside,
  onOpenCategory,
  placeholder = strings.tasks.categoryMenuTitle,
}: Props) {
  const { colors } = useTheme();
  const categoryColor = category?.color ?? colors.textSecondary;

  return (
    <Pressable
      accessible={false}
      onPress={onPressOutside}
      style={[styles.header, category ? { backgroundColor: tagTint(category.color, 0.3) } : null]}
    >
      <Pressable
        onPress={onOpenCategory}
        accessibilityRole="button"
        accessibilityLabel={strings.tasks.changeCategory}
        style={({ pressed, hovered }) => [
          styles.tagChip,
          styles.categoryChip,
          { borderColor: category ? category.color : colors.borderColor },
          category && { backgroundColor: tagTint(category.color, 0.14) },
          // Hover deepens the category tint so it stays in the header's colour scheme.
          (hovered || pressed) &&
            (category
              ? { backgroundColor: tagTint(category.color, pressed ? 0.4 : 0.28) }
              : styles.categoryChipHover),
        ]}>
        {category ? (
          <CategoryIconGlyph icon={category.icon} size={14} strokeWidth={2.2} color={categoryColor} />
        ) : (
          <CircleDashed size={14} strokeWidth={2.2} color={categoryColor} />
        )}
        <Text
          style={[styles.tagChipText, styles.categoryChipText, { color: categoryColor }]}
          numberOfLines={1}>
          {category ? category.name : placeholder}
        </Text>
        <ChevronDown size={14} strokeWidth={2.5} color={categoryColor} />
      </Pressable>
      <Pressable
        onPress={onClose}
        style={styles.closeBtn}
        hitSlop={8}
        accessibilityLabel={strings.common.close}
      >
        <X size={20} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}
