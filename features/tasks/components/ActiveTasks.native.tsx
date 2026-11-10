import { DRAG_ACTIVATION_DELAY_MS } from '@/shared/constants/timing';
import { useCallback } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridRenderItem } from 'react-native-sortables';
import ToDoItem from '@/features/tasks/components/item/ToDoItem';
import ActiveTasksFrame from '@/features/tasks/components/ActiveTasksFrame';
import ActiveTasksHeader from '@/features/tasks/components/ActiveTasksHeader';
import EmptyState from '@/shared/ui/EmptyState';
import { useActiveTasksScreen } from '@/features/tasks/lib/useActiveTasksScreen';
import { useTaskRowProps } from '@/features/tasks/lib/useTaskListActions';
import type { Task } from '@/types';

export default function ActiveTasks() {
  const view = useActiveTasksScreen();
  const { styles, filters, handleToggle, handleDragEnd } = view;
  const { canReorder, filteredTasks, emptyCopy } = filters;
  const { rowProps, activeTaskId } = useTaskRowProps(handleToggle);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const renderItem = useCallback<SortableGridRenderItem<Task>>(
    ({ item, index }) => (
      <View style={styles.itemWrap}>
        <Sortable.Handle
          mode={canReorder ? 'draggable' : 'non-draggable'}
          style={styles.itemHandle}>
          <ToDoItem
            task={item}
            index={index}
            {...rowProps}
            isPomoActive={activeTaskId === item.id}
          />
        </Sortable.Handle>
      </View>
    ),
    [canReorder, rowProps, activeTaskId, styles.itemHandle, styles.itemWrap]
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
            onDragEnd={handleDragEnd}
            scrollableRef={scrollableRef}
            customHandle
            sortEnabled={canReorder}
            dragActivationDelay={DRAG_ACTIVATION_DELAY_MS}
            activeItemScale={1.04}
            inactiveItemOpacity={1}
            hapticsEnabled
            itemEntering={null}
            itemExiting={null}
            itemsLayoutTransitionMode="reorder"
          />
        )}
      </Animated.ScrollView>
    </ActiveTasksFrame>
  );
}
