import {
  createElement,
  useCallback,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { FlatList, View } from 'react-native';
import { useWebRowDrag } from '@/features/tasks/lib/useWebRowDrag';
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

type RowDrag = ReturnType<typeof useWebRowDrag<Task>>;

// Plain DOM wrappers around a row: the outer one is measured, the inner one moves while the
// row is dragged (see useWebRowDrag). The whole row is the drag surface.
function DraggableRow({
  id,
  register,
  onPointerDown,
  children,
}: {
  id: number;
  register: RowDrag['register'];
  onPointerDown: RowDrag['onPointerDown'];
  children: ReactNode;
}) {
  const outerRef = useCallback(
    (el: HTMLDivElement | null) => register(id, 'outer', el),
    [id, register]
  );
  const innerRef = useCallback(
    (el: HTMLDivElement | null) => register(id, 'inner', el),
    [id, register]
  );
  return createElement(
    'div',
    { ref: outerRef },
    createElement(
      'div',
      {
        ref: innerRef,
        onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => onPointerDown(id, event),
      },
      children
    )
  );
}

export default function ActiveTasks() {
  const view = useActiveTasksScreen();
  const { styles, filters, handleToggle, handleDragEnd, categories } = view;
  const { canReorder, filteredTasks, emptyCopy } = filters;
  const { rowProps, activeTaskId } = useTaskRowProps(handleToggle);

  const { selecting, selectedTasks, select, toggle, clear } = useTaskSelection(filteredTasks);
  const { duplicate, setCategory, remove } = useTaskBulkActions(selectedTasks, clear);
  const selectedIds = useMemo(() => new Set(selectedTasks.map((t) => t.id)), [selectedTasks]);
  const toggleSelect = useCallback((task: Task) => toggle(task.id), [toggle]);
  const holdTask = useCallback((task: Task) => select(task.id), [select]);

  const dragEnabled = canReorder && !selecting;
  const listRef = useRef<FlatList<Task>>(null);
  const getScrollNode = useCallback(
    () => (listRef.current?.getScrollableNode() as HTMLElement | null | undefined) ?? null,
    []
  );
  const onReorder = useCallback((data: Task[]) => handleDragEnd({ data }), [handleDragEnd]);
  const { register, onPointerDown } = useWebRowDrag(
    filteredTasks,
    dragEnabled,
    onReorder,
    select,
    getScrollNode
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => (
      <View style={styles.itemWrap}>
        <DraggableRow id={item.id} register={register} onPointerDown={onPointerDown}>
          <ToDoItem
            task={item}
            index={index}
            {...rowProps}
            isPomoActive={activeTaskId === item.id}
            selecting={selecting}
            selected={selectedIds.has(item.id)}
            onToggleSelect={toggleSelect}
            // While rows can be dragged, a hold is detected by useWebRowDrag (as on native).
            onHold={dragEnabled ? undefined : holdTask}
          />
        </DraggableRow>
      </View>
    ),
    [
      register,
      onPointerDown,
      rowProps,
      activeTaskId,
      selecting,
      selectedIds,
      toggleSelect,
      holdTask,
      dragEnabled,
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
        ref={listRef}
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
