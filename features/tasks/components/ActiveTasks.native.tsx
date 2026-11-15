import { DRAG_ACTIVATION_DELAY_MS } from '@/shared/constants/timing';
import { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridRenderItem } from 'react-native-sortables';
import ToDoItem, { type TaskTouchRootProps } from '@/features/tasks/components/item/ToDoItem';
import ActiveTasksFrame from '@/features/tasks/components/ActiveTasksFrame';
import ActiveTasksHeader from '@/features/tasks/components/ActiveTasksHeader';
import TaskSelectionBar from '@/features/tasks/components/TaskSelectionBar';
import EmptyState from '@/shared/ui/EmptyState';
import { useActiveTasksScreen } from '@/features/tasks/lib/useActiveTasksScreen';
import { useTaskSelection } from '@/features/tasks/lib/useTaskSelection';
import { useTaskBulkActions } from '@/features/tasks/lib/useTaskBulkActions';
import { useTaskRowProps } from '@/features/tasks/lib/useTaskListActions';
import type { Task } from '@/types';

// Inside a sortable list taps and long presses go through Sortable.Touchable so they
// cooperate with the drag gesture.
function SortableTouchRoot({ onTap, onLongPress, style, children }: TaskTouchRootProps) {
  return (
    <Sortable.Touchable onTap={onTap} onLongPress={onLongPress} style={style}>
      {children}
    </Sortable.Touchable>
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

  // Android back leaves selection mode instead of navigating away.
  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      clear();
      return true;
    });
    return () => sub.remove();
  }, [selecting, clear]);

  const dragEnabled = canReorder && !selecting;

  // Holding a row without moving it ends the drag in place: treat that as "enter action mode".
  const onDragEnd = useCallback(
    (params: Parameters<typeof handleDragEnd>[0] & { key: string; fromIndex: number; toIndex: number }) => {
      if (params.fromIndex === params.toIndex) {
        select(Number(params.key));
        return;
      }
      handleDragEnd(params);
    },
    [handleDragEnd, select]
  );

  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const renderItem = useCallback<SortableGridRenderItem<Task>>(
    ({ item, index }) => (
      <View style={styles.itemWrap}>
        <Sortable.Handle
          mode={dragEnabled ? 'draggable' : 'non-draggable'}
          style={styles.itemHandle}>
          <ToDoItem
            task={item}
            index={index}
            {...rowProps}
            isPomoActive={activeTaskId === item.id}
            TouchRoot={SortableTouchRoot}
            selecting={selecting}
            selected={selectedIds.has(item.id)}
            onToggleSelect={toggleSelect}
            // Draggable rows enter action mode via drag end; others via a long press.
            onHold={canReorder ? undefined : holdTask}
          />
        </Sortable.Handle>
      </View>
    ),
    [
      dragEnabled,
      canReorder,
      selecting,
      selectedIds,
      toggleSelect,
      holdTask,
      rowProps,
      activeTaskId,
      styles.itemHandle,
      styles.itemWrap,
    ]
  );

  const listContentStyle = [
    styles.tasksContent,
    styles.tasksContentPad,
    styles.tasksContentDragPad,
    filteredTasks.length === 0 && styles.tasksContentEmpty,
  ];

  return (
    <ActiveTasksFrame view={view}>
      <Animated.ScrollView
        ref={scrollableRef}
        style={styles.tasksList}
        contentContainerStyle={listContentStyle}
        keyboardShouldPersistTaps="handled">
        <ActiveTasksHeader filters={filters} />
        {filteredTasks.length === 0 ? (
          <EmptyState title={emptyCopy.title} text={emptyCopy.text} />
        ) : (
          <Sortable.Grid
            columns={1}
            data={filteredTasks}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            onDragEnd={onDragEnd}
            scrollableRef={scrollableRef}
            customHandle
            sortEnabled={dragEnabled}
            dragActivationDelay={DRAG_ACTIVATION_DELAY_MS}
            // No lift on hold: holding without moving enters action mode, so the row only
            // visibly follows the finger once it is actually dragged.
            activeItemScale={1}
            activeItemShadowOpacity={0}
            enableActiveItemSnap={false}
            inactiveItemOpacity={1}
            hapticsEnabled
            itemEntering={null}
            itemExiting={null}
            itemsLayoutTransitionMode="reorder"
          />
        )}
      </Animated.ScrollView>
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
