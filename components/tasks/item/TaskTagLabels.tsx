import { Text, View } from 'react-native';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import type { Tag } from '@/types';

interface TaskTagLabelsProps {
  tags: Tag[];
  styles: TodoItemStyles;
}

export default function TaskTagLabels({ tags, styles }: TaskTagLabelsProps) {
  if (tags.length === 0) return null;

  return (
    <View style={styles.tagRow} pointerEvents="none">
      {tags.map((tag) => (
        <Text key={tag.id} style={[styles.tagLabel, { color: tag.color }]} numberOfLines={1}>
          #{tag.name}
        </Text>
      ))}
    </View>
  );
}
