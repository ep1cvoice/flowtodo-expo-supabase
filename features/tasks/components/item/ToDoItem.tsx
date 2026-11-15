import { memo, useMemo, type ComponentType, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { strings } from '@/shared/lib/strings';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DueDateBadge from '@/features/tasks/components/item/DueDateBadge';
import TaskCheckbox from '@/features/tasks/components/item/TaskCheckbox';
import TaskDesktopActions from '@/features/tasks/components/item/TaskDesktopActions';
import TaskMobileTrailing from '@/features/tasks/components/item/TaskMobileTrailing';
import TaskReorderButtons from '@/features/tasks/components/item/TaskReorderButtons';
import TaskTagLabels from '@/features/tasks/components/item/TaskTagLabels';
import { useTaskItemModals } from '@/features/tasks/components/item/TaskItemModalsContext';
import { useTodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import CategoryIconGlyph from '@/shared/ui/CategoryIconGlyph';
import { useTheme } from '@/shared/providers/ThemeContext';
import { categoryCardWash } from '@/shared/lib/color';
import type { Task } from '@/types';
import { isWeb } from '@/shared/lib/platform';

interface ToDoItemProps {
  task: Task;
  index?: number;
  // The row is memoized: global state (pomodoro, window size) is read by the list and passed
  // in, and the handlers must be referentially stable for memoization to help (see
  // useTaskRowProps).
  isMobile: boolean;
  isPomoActive: boolean;
  canStart: boolean;
  onStartPomodoro: (task: Task) => void;
  onToggleDone: (task: Task) => Promise<boolean>;
  showReorderButtons?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMove?: (id: number, direction: -1 | 1) => void;
  // Selection (action) mode: a tap toggles the row's selection instead of opening details.
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: (task: Task) => void;
  // Long press without dragging; only passed when the row cannot be dragged.
  onHold?: (task: Task) => void;
  // Replaces the Pressable root (e.g. Sortable.Touchable inside a sortable list, which
  // cooperates with the drag gesture where a JS Pressable does not).
  TouchRoot?: ComponentType<TaskTouchRootProps>;
}

export interface TaskTouchRootProps {
  onTap: () => void;
  onLongPress?: () => void;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}

function ToDoItem({
  task,
  index = 0,
  isMobile,
  isPomoActive,
  canStart,
  onStartPomodoro,
  onToggleDone,
  showReorderButtons = false,
  canMoveUp = false,
  canMoveDown = false,
  onMove,
  selecting = false,
  selected = false,
  onToggleSelect,
  onHold,
  TouchRoot,
}: ToDoItemProps) {
  const { isDark } = useTheme();
  const { colors, styles } = useTodoItemStyles();
  const { open } = useTaskItemModals();
  const handleStartPomodoro = () => onStartPomodoro(task);
  const handleToggleDone = () => onToggleDone(task);

  const category = task.category;
  const tags = task.tags ?? [];

  const dueDate = useMemo(
    () => (task.scheduled ? new Date(task.scheduled) : null),
    [task.scheduled]
  );

  // Category cards keep the neutral base and border; the category colour fades in from the
  // left edge towards the right as a gradient.
  const categoryGradient = category
    ? ([
        categoryCardWash(category.color, 0),
        categoryCardWash(category.color, isDark ? 0.42 : 0.3),
      ] as const)
    : null;
  const completedWash = task.done && !isDark && !category ? colors.chrome : null;
  const cardWash = completedWash;

  const openDetail = () => (selecting ? onToggleSelect?.(task) : open('detail', task));
  const handleHold = onHold ? () => onHold(task) : undefined;
  const openActions = () => open('actions', task);
  const requestDelete = () => open('confirmDelete', task);
  const openCalendar = () => open('calendar', task);

  const content = (
    <>
      {categoryGradient ? (
        <LinearGradient
          colors={categoryGradient}
          locations={[0.25, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.todoMainRow}>
        {showReorderButtons ? (
          <TaskReorderButtons
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            colors={colors}
            styles={styles}
            onMoveUp={onMove ? () => onMove(task.id, -1) : undefined}
            onMoveDown={onMove ? () => onMove(task.id, 1) : undefined}
          />
        ) : null}

        <View style={styles.todoContent}>
          <View style={styles.todoTitleRow}>
            {selecting ? (
              <View
                style={[styles.todoCheckbox, selected && styles.checked]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              >
                {selected ? <Check size={16} strokeWidth={3} color="#ffffff" /> : null}
              </View>
            ) : (
              <TaskCheckbox done={task.done} styles={styles} onPress={handleToggleDone} />
            )}

            <View style={styles.todoBody}>
              <Text
                style={[styles.titleText, task.done && styles.done]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {task.title}
              </Text>
            </View>

            <View style={styles.sideColumn} pointerEvents={selecting ? 'none' : 'auto'}>
              {category ? (
                <View
                  style={styles.categoryMark}
                  pointerEvents="none"
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                >
                  <CategoryIconGlyph
                    icon={category.icon}
                    size={22}
                    strokeWidth={2}
                    color={category.color}
                  />
                </View>
              ) : null}
              {!isMobile ? (
                <TaskDesktopActions
                  taskId={task.id}
                  done={task.done}
                  isPomoActive={isPomoActive}
                  canStart={canStart}
                  colors={colors}
                  styles={styles}
                  onStartPomodoro={handleStartPomodoro}
                  onOpenCalendar={openCalendar}
                  onDelete={requestDelete}
                />
              ) : (
                <TaskMobileTrailing
                  done={task.done}
                  colors={colors}
                  styles={styles}
                  onOpenActions={openActions}
                  onDelete={requestDelete}
                />
              )}
            </View>
          </View>
          {dueDate || tags.length > 0 ? (
            <View style={styles.metaRow}>
              {dueDate ? (
                <View style={styles.metaControls}>
                  <DueDateBadge date={dueDate} styles={styles} onPress={openCalendar} />
                </View>
              ) : null}
              <TaskTagLabels tags={tags} styles={styles} />
            </View>
          ) : null}
        </View>
      </View>
    </>
  );

  if (TouchRoot) {
    return (
      <TouchRoot
        onTap={openDetail}
        onLongPress={handleHold}
        style={[
          styles.todoItem,
          cardWash ? { backgroundColor: cardWash } : null,
          selected ? styles.selectedItem : null,
        ]}
      >
        {content}
      </TouchRoot>
    );
  }

  return (
    <Pressable
      onPress={openDetail}
      onLongPress={handleHold}
      accessibilityRole="none"
      accessibilityLabel={task.title}
      accessibilityHint={strings.tasks.showDetails}
      {...(isWeb ? { tabIndex: -1 } : null)}
      style={({ pressed, hovered }) => [
        styles.todoItem,
        cardWash ? { backgroundColor: cardWash } : null,
        hovered && !cardWash ? styles.itemHovered : null,
        hovered && cardWash ? styles.itemHoveredTinted : null,
        selected ? styles.selectedItem : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

export default memo(ToDoItem);
