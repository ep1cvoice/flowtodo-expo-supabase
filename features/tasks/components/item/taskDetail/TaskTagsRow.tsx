import { strings } from '@/shared/lib/strings';
import { Pressable, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { Tag } from '@/types';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';

interface Props {
  tags: Tag[];
  styles: TaskDetailStyles;
  onPress: () => void;
  // Text while there are no tags.
  placeholder?: string;
}

// One line of tags (or the "+ Tag" placeholder); tapping it opens the tags menu.
export default function TaskTagsRow({
  tags,
  styles,
  onPress,
  placeholder = strings.tasks.addTag,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings.tasks.addTagLabel}
      style={({ pressed, hovered }) => [
        styles.tagsRow,
        (hovered || pressed) && styles.iconBtnPressed,
      ]}>
      <Plus size={16} strokeWidth={2.5} color={colors.textSecondary} />
      <Text style={styles.tagsText} numberOfLines={1}>
        {tags.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>{placeholder}</Text>
        ) : (
          tags.map((tag) => (
            <Text key={tag.id} style={{ color: tag.color }}>
              #{tag.name}{'  '}
            </Text>
          ))
        )}
      </Text>
    </Pressable>
  );
}
