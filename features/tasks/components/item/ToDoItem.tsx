import { useState } from 'react';
import {
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import CalendarModal from '@/features/tasks/components/calendar/CalendarModal';
import EditTaskModal from '@/features/tasks/components/form/EditTaskModal';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import DueDateBadge from '@/features/tasks/components/item/DueDateBadge';
import MobileActionsSheet from '@/features/tasks/components/item/MobileActionsSheet';
import TaskCheckbox from '@/features/tasks/components/item/TaskCheckbox';
import TaskDesktopActions from '@/features/tasks/components/item/TaskDesktopActions';
import TaskDetailModal from '@/features/tasks/components/item/TaskDetailModal';
import TaskMobileTrailing from '@/features/tasks/components/item/TaskMobileTrailing';
import TaskReorderButtons from '@/features/tasks/components/item/TaskReorderButtons';
import TaskTagLabels from '@/features/tasks/components/item/TaskTagLabels';
import PomodoroTimer from '@/features/pomodoro/components/PomodoroTimer';
import { useTodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import { getCategoryIcon } from '@/shared/constants/categoryIcons';
import { tokens } from '@/shared/constants/theme';
import { usePomodoro } from '@/features/pomodoro/PomodoroContext';
import { useTasks } from '@/features/tasks/TasksContext';
import { useTheme } from '@/shared/providers/ThemeContext';
import { useToast } from '@/shared/providers/ToastContext';
import { toScheduledIso } from '@/features/tasks/lib/calendarDate';
import { categoryCardWash } from '@/shared/lib/color';
import { toastForError } from '@/shared/lib/networkError';
import type { Task } from '@/types';

interface ToDoItemProps {
  task: Task;
  index?: number;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void | Promise<void>;
  drag?: () => void;
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
  onDelete,
  drag,
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
  const { showToast } = useToast();
  const { categories, tags: allTags, updateTask, setTaskScheduled } = useTasks();
  const { activeTaskId, canStart, startPomo, endPomo } = usePomodoro();

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const isPomoActive = activeTaskId === task.id;

  const category = task.category;
  const tags = task.tags ?? [];
  const CategoryIconComp = category ? getCategoryIcon(category.icon) : null;

  const dueDate = task.scheduled ? new Date(task.scheduled) : null;

  const categoryWash = category
    ? categoryCardWash(category.color, isDark ? 0.42 : 0.2)
    : null;
  const completedWash = task.done && !isDark && !categoryWash ? colors.chrome : null;
  const cardWash = categoryWash ?? completedWash;

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleStartPomodoro = () => {
    if (!canStart || task.done) return;
    startPomo(task.id).catch((err) => {
      showToast(toastForError(err, 'Could not start pomodoro.'), 'error');
    });
  };

  const handleToggleDone = async () => {
    if (isPomoActive) {
      try {
        await endPomo();
      } catch (err) {
        showToast(toastForError(err, 'Could not stop pomodoro.'), 'error');
        return false;
      }
    }
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onToggle(task.id);
    return true;
  };

  const handleDelete = async () => {
    if (isPomoActive) {
      try {
        await endPomo();
      } catch (err) {
        showToast(toastForError(err, 'Could not stop pomodoro.'), 'error');
        return false;
      }
    }
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await onDelete(task.id);
    return true;
  };

  const requestDelete = () => {
    setConfirmDelete(true);
  };

  const openCalendar = () => {
    setShowCalendarModal(true);
  };

  const handleClearDate = async () => {
    try {
      await setTaskScheduled(task.id, null);
      setShowCalendarModal(false);
    } catch (err) {
      showToast(toastForError(err, 'Could not update date.'), 'error');
    }
  };

  const handleConfirmDate = async (date: Date) => {
    try {
      await setTaskScheduled(task.id, toScheduledIso(date));
      setShowCalendarModal(false);
    } catch (err) {
      showToast(toastForError(err, 'Could not update date.'), 'error');
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setShowDetailModal(true)}
        onLongPress={drag}
        delayLongPress={drag ? 450 : undefined}
        accessibilityRole="none"
        accessibilityLabel={task.title}
        accessibilityHint={drag ? 'Opens details. Long press to reorder' : 'Show task details'}
        {...(Platform.OS === 'web' ? { tabIndex: -1 } : null)}
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
                    onOpenActions={() => setShowMobileActions(true)}
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

      <TaskDetailModal
        visible={showDetailModal}
        task={task}
        canStart={canStart}
        isPomoActive={isPomoActive}
        onClose={() => setShowDetailModal(false)}
        onDelete={async () => {
          const deleted = await handleDelete();
          if (deleted) setShowDetailModal(false);
          return deleted;
        }}
        onEdit={handleEdit}
        onOpenCalendar={openCalendar}
        onStartPomodoro={handleStartPomodoro}
        onToggleComplete={async () => {
          const ok = await handleToggleDone();
          if (ok && !task.done) setShowDetailModal(false);
        }}
      />

      <MobileActionsSheet
        visible={showMobileActions}
        canStart={canStart}
        taskTitle={task.title}
        colors={colors}
        styles={styles}
        onClose={() => setShowMobileActions(false)}
        onStartPomodoro={handleStartPomodoro}
        onOpenCalendar={openCalendar}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmModal
        visible={confirmDelete}
        title="Delete task?"
        message={`"${task.title}" will be permanently deleted.`}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          const deleted = await handleDelete();
          if (deleted) setConfirmDelete(false);
        }}
      />

      <EditTaskModal
        visible={showEditModal}
        task={task}
        categories={categories}
        tags={allTags}
        onClose={() => setShowEditModal(false)}
        onUpdate={updateTask}
      />

      <CalendarModal
        visible={showCalendarModal}
        selected={dueDate}
        onClose={() => setShowCalendarModal(false)}
        onClear={handleClearDate}
        onConfirm={handleConfirmDate}
      />
    </>
  );
}
