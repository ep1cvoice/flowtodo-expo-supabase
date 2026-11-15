import { useCallback, useMemo } from 'react';
import { FlatList, View } from 'react-native';
import ToDoItem from '@/features/tasks/components/item/ToDoItem';
import ActiveTasksFrame from '@/features/tasks/components/ActiveTasksFrame';
import ActiveTasksHeader from '@/features/tasks/components/ActiveTasksHeader';
import TaskSelectionBar from '@/features/tasks/components/TaskSelectionBar';
import EmptyState from '@/shared/ui/EmptyState';
import { useActiveTasksScreen } from '@/features/tasks/lib/useActiveTasksScreen';
import { useTaskSelection } from '@/features/tasks/lib/useTaskSelection';
import { useTaskBulkActions } from '@/features/tasks/lib/useTaskBulkActions';
import { useTaskRowProps } from '@/features/tasks/lib/useTaskListActions';
import type { Task } from '@/types';

export default function ActiveTasks() {
  const view = useActiveTasksScreen();
  const { styles, filters, handleToggle, moveTask, categories } = view;
  const { canReorder, filteredTasks, emptyCopy } = filters;
  const { rowProps, activeTaskId } = useTaskRowProps(handleToggle);

  const { selecting, selectedTasks, select, toggle, clear } = useTaskSelection(filteredTasks);
  const { duplicate, setCategory, remove } = useTaskBulkActions(selectedTasks, clear);
  const selectedIds = useMemo(() => new Set(selectedTasks.map((t) => t.id)), [selectedTasks]);
  const toggleSelect = useCallback((task: Task) => toggle(task.id), [toggle]);
  const holdTask = useCallback((task: Task) => select(task.id), [select]);

  const renderItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => (
      <View style={styles.itemWrap}>
        <ToDoItem
          task={item}
          index={index}
          {...rowProps}
          isPomoActive={activeTaskId === item.id}
          showReorderButtons={canReorder && !selecting}
          canMoveUp={canReorder && index > 0}
          canMoveDown={canReorder && index < filteredTasks.length - 1}
          onMove={moveTask}
          selecting={selecting}
          selected={selectedIds.has(item.id)}
          onToggleSelect={toggleSelect}
          onHold={holdTask}
        />
      </View>
    ),
    [
      canReorder,
      filteredTasks.length,
      rowProps,
      activeTaskId,
      moveTask,
      selecting,
      selectedIds,
      toggleSelect,
      holdTask,
      styles.itemWrap,
    ]
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
        extraData={selectedIds}
      />
      {selecting ? (
        <TaskSelectionBar
          count={selectedTasks.length}
          categories={categories}
          onCancel={clear}
          onDuplicate={duplicate}
          onSetCategory={setCategory}
          onDelete={remove}
        />
      ) : null}
    </ActiveTasksFrame>
  );
}
