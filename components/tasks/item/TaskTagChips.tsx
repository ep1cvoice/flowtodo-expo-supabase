import { Text, View } from 'react-native';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import { hexToRgb } from '@/lib/color';
import type { Tag } from '@/types';

interface TaskTagChipsProps {
  tags: Tag[];
  styles: TodoItemStyles;
  maxVisible?: number;
}

function tagTint(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function TaskTagChips({ tags, styles, maxVisible = 2 }: TaskTagChipsProps) {
  if (tags.length === 0) return null;

  const visible = tags.slice(0, maxVisible);
  const extra = tags.length - visible.length;

  return (
    <View style={styles.tagRow} pointerEvents="none">
      {visible.map((tag) => (
        <View
          key={tag.id}
          style={[
            styles.tagChip,
            {
              borderColor: tag.color,
              backgroundColor: tagTint(tag.color, 0.14),
            },
          ]}>
          <Text style={[styles.tagChipText, { color: tag.color }]} numberOfLines={1}>
            #{tag.name}
          </Text>
        </View>
      ))}
      {extra > 0 ? <Text style={styles.tagMore}>+{extra}</Text> : null}
    </View>
  );
}
