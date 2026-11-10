import { useCallback } from 'react';
import { FlatList, View } from 'react-native';
import ToDoItem from '@/features/tasks/components/item/ToDoItem';
import ActiveTasksFrame from '@/features/tasks/components/ActiveTasksFrame';
import ActiveTasksHeader from '@/features/tasks/components/ActiveTasksHeader';
import EmptyState from '@/shared/ui/EmptyState';
import { useActiveTasksScreen } from '@/features/tasks/lib/useActiveTasksScreen';
import { useTaskRowProps } from '@/features/tasks/lib/useTaskListActions';
import type { Task } from '@/types';

export default function ActiveTasks() {
  const view = useActiveTasksScreen();
  const { styles, filters, handleToggle, moveTask } = view;
  const { canReorder, filteredTasks, emptyCopy } = filters;
  const { rowProps, activeTaskId } = useTaskRowProps(handleToggle);

  const renderItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => (
      <View style={styles.itemWrap}>
        <ToDoItem
          task={item}
          index={index}
          {...rowProps}
          isPomoActive={activeTaskId === item.id}
          showReorderButtons={canReorder}
          canMoveUp={canReorder && index > 0}
          canMoveDown={canReorder && index < filteredTasks.length - 1}
          onMove={moveTask}
        />
      </View>
    ),
    [canReorder, filteredTasks.length, rowProps, activeTaskId, moveTask, styles.itemWrap]
  );

  const listContentStyle = [
    styles.tasksContent,
    styles.tasksContentPad,
    filteredTasks.length === 0 && styles.tasksContentEmpty,
  ];

  return (
    <ActiveTasksFrame view={view}>
      <FlatList
        style={styles.tasksList}
        contentContainerStyle={listContentStyle}
        data={filteredTasks}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={<ActiveTasksHeader filters={filters} />}
        ListEmptyComponent={<EmptyState title={emptyCopy.title} text={emptyCopy.text} />}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
      />
    </ActiveTasksFrame>
  );
}
