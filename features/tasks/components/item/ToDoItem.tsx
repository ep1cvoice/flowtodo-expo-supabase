import { memo, useMemo } from 'react';
import { strings } from '@/shared/lib/strings';
import { Pressable, Text, View } from 'react-native';
import DueDateBadge from '@/features/tasks/components/item/DueDateBadge';
import TaskCheckbox from '@/features/tasks/components/item/TaskCheckbox';
import TaskDesktopActions from '@/features/tasks/components/item/TaskDesktopActions';
import TaskMobileTrailing from '@/features/tasks/components/item/TaskMobileTrailing';
import TaskReorderButtons from '@/features/tasks/components/item/TaskReorderButtons';
import TaskTagLabels from '@/features/tasks/components/item/TaskTagLabels';
import PomodoroTimer from '@/features/pomodoro/components/PomodoroTimer';
import { useTaskItemModals } from '@/features/tasks/components/item/TaskItemModalsContext';
import { useTodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import { getCategoryIcon } from '@/shared/constants/categoryIcons';
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
}: ToDoItemProps) {
  const { isDark } = useTheme();
  const { colors, styles } = useTodoItemStyles();
  const { open } = useTaskItemModals();
  const handleStartPomodoro = () => onStartPomodoro(task);
  const handleToggleDone = () => onToggleDone(task);

  const category = task.category;
  const tags = task.tags ?? [];
  const CategoryIconComp = category ? getCategoryIcon(category.icon) : null;

  const dueDate = useMemo(
    () => (task.scheduled ? new Date(task.scheduled) : null),
    [task.scheduled]
  );

  const categoryWash = category
    ? categoryCardWash(category.color, isDark ? 0.42 : 0.2)
    : null;
  const completedWash = task.done && !isDark && !categoryWash ? colors.chrome : null;
  const cardWash = categoryWash ?? completedWash;

  const openDetail = () => open('detail', task);
  const openActions = () => open('actions', task);
  const requestDelete = () => open('confirmDelete', task);
  const handleEdit = () => open('edit', task);
  const openCalendar = () => open('calendar', task);

  return (
      <Pressable
        onPress={openDetail}
        accessibilityRole="none"
        accessibilityLabel={task.title}
        accessibilityHint={strings.tasks.showDetails}
        {...(isWeb ? { tabIndex: -1 } : null)}
        style={({ pressed, hovered }) => [
          styles.todoItem,
          cardWash ? { backgroundColor: cardWash, borderColor: categoryWash ?? colors.borderColor } : null,
          hovered && !cardWash ? styles.itemHovered : null,
          hovered && cardWash ? styles.itemHoveredTinted : null,
          pressed ? styles.pressed : null,
        ]}>
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
              <TaskCheckbox done={task.done} styles={styles} onPress={handleToggleDone} />

              <View style={styles.todoBody}>
                <Text
                  style={[styles.titleText, task.done && styles.done]}
                  numberOfLines={2}
                  ellipsizeMode="tail">
                  {task.title}
                </Text>
              </View>

              <View style={styles.sideColumn}>
                {CategoryIconComp && category ? (
                  <View
                    style={styles.categoryMark}
                    pointerEvents="none"
                    accessible={false}
                    importantForAccessibility="no-hide-descendants">
                    <CategoryIconComp size={22} strokeWidth={2} color={category.color} />
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
                    onEdit={handleEdit}
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
            {dueDate || isPomoActive || tags.length > 0 ? (
              <View style={styles.metaRow}>
                {dueDate || isPomoActive ? (
                  <View style={styles.metaControls}>
                    {dueDate ? (
                      <DueDateBadge date={dueDate} styles={styles} onPress={openCalendar} />
                    ) : null}
                    {isPomoActive ? <PomodoroTimer taskId={task.id} taskTitle={task.title} /> : null}
                  </View>
                ) : null}
                <TaskTagLabels tags={tags} styles={styles} />
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
  );
}

export default memo(ToDoItem);
