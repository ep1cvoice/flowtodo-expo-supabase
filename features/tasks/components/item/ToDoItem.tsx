import { strings } from '@/shared/lib/strings';
import {
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import DueDateBadge from '@/features/tasks/components/item/DueDateBadge';
import TaskCheckbox from '@/features/tasks/components/item/TaskCheckbox';
import TaskDesktopActions from '@/features/tasks/components/item/TaskDesktopActions';
import TaskMobileTrailing from '@/features/tasks/components/item/TaskMobileTrailing';
import TaskReorderButtons from '@/features/tasks/components/item/TaskReorderButtons';
import TaskTagLabels from '@/features/tasks/components/item/TaskTagLabels';
import PomodoroTimer from '@/features/pomodoro/components/PomodoroTimer';
import { useTaskItemModals } from '@/features/tasks/components/item/TaskItemModalsContext';
import { useTaskItemActions } from '@/features/tasks/lib/useTaskItemActions';
import { useTodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import { getCategoryIcon } from '@/shared/constants/categoryIcons';
import { tokens } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';
import { categoryCardWash } from '@/shared/lib/color';
import type { Task } from '@/types';
import { isWeb } from '@/shared/lib/platform';

interface ToDoItemProps {
  task: Task;
  index?: number;
  onToggle: (id: number) => void;
  showReorderButtons?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function ToDoItem({
  task,
  index = 0,
  onToggle,
  showReorderButtons = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
}: ToDoItemProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < tokens.desktopBreakpoint;
  const { isDark } = useTheme();
  const { colors, styles } = useTodoItemStyles();
  const { open } = useTaskItemModals();
  const { isPomoActive, canStart, handleStartPomodoro, handleToggleDone } = useTaskItemActions(
    task,
    onToggle,
  );

  const category = task.category;
  const tags = task.tags ?? [];
  const CategoryIconComp = category ? getCategoryIcon(category.icon) : null;

  const dueDate = task.scheduled ? new Date(task.scheduled) : null;

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
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
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
                    {isPomoActive ? <PomodoroTimer taskId={task.id} /> : null}
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
