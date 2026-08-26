import { Text, View } from 'react-native';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import type { Tag } from '@/types';

interface TaskTagChipsProps {
  tags: Tag[];
  styles: TodoItemStyles;
}

export default function TaskTagChips({ tags, styles }: TaskTagChipsProps) {
  if (tags.length === 0) return null;

  return (
    <View style={styles.tagChipRow}>
      {tags.map((tag) => (
        <View key={tag.id} style={[styles.tagChip, { borderColor: tag.color }]}>
          <Text style={[styles.tagChipText, { color: tag.color }]}>#{tag.name}</Text>
        </View>
      ))}
    </View>
  );
}
