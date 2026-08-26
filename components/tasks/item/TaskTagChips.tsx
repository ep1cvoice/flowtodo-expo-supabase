import { Text } from 'react-native';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import type { Tag } from '@/types';

interface TaskTagChipsProps {
  tags: Tag[];
  styles: TodoItemStyles;
}

export default function TaskTagChips({ tags, styles }: TaskTagChipsProps) {
  if (tags.length === 0) return null;

  return (
    <Text style={styles.tagMeta} numberOfLines={1} ellipsizeMode="tail">
      {tags.map((tag, index) => (
        <Text key={tag.id} style={[styles.tagMetaItem, { color: tag.color }]}>
          {index > 0 ? '  ' : ''}#{tag.name}
        </Text>
      ))}
    </Text>
  );
}
