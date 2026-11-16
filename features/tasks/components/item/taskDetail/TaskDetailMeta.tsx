import { View } from 'react-native';
import type { Task } from '@/types';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import TaskDetailTitle from '@/features/tasks/components/item/taskDetail/TaskDetailTitle';
import TaskTagsRow from '@/features/tasks/components/item/taskDetail/TaskTagsRow';

interface Props {
  task: Task;
  styles: TaskDetailStyles;
  onSaveTitle: (title: string) => void | Promise<unknown>;
  onArmSkipSave: () => void;
  onToggleComplete: () => void;
  onOpenTags: () => void;
}

// Checkbox + editable title, with one line of tags below; tapping the tags opens the menu
// with the full list.
export default function TaskDetailMeta({
  task,
  styles,
  onSaveTitle,
  onArmSkipSave,
  onToggleComplete,
  onOpenTags,
}: Props) {
  return (
    <View style={[styles.meta, styles.metaDivider]}>
      <TaskDetailTitle
        task={task}
        styles={styles}
        onSaveTitle={onSaveTitle}
        onArmSkipSave={onArmSkipSave}
        onToggleComplete={onToggleComplete}
      />

      <TaskTagsRow tags={task.tags ?? []} styles={styles} onPress={onOpenTags} />
    </View>
  );
}
