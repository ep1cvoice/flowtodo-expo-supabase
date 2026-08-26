import { useState } from 'react';
import {
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import CalendarModal from '@/components/tasks/calendar/CalendarModal';
import EditTaskModal from '@/components/tasks/form/EditTaskModal';
import DueDateBadge from '@/components/tasks/item/DueDateBadge';
import MobileActionsSheet from '@/components/tasks/item/MobileActionsSheet';
import TaskCheckbox from '@/components/tasks/item/TaskCheckbox';
import TaskDesktopActions from '@/components/tasks/item/TaskDesktopActions';
import TaskDetailModal from '@/components/tasks/item/TaskDetailModal';
import TaskMobileTrailing from '@/components/tasks/item/TaskMobileTrailing';
import TaskReorderButtons from '@/components/tasks/item/TaskReorderButtons';
import TaskTagChips from '@/components/tasks/item/TaskTagChips';
import PomodoroTimer from '@/components/tasks/pomodoro/PomodoroTimer';
import { useTodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { tokens } from '@/constants/theme';
import { usePomodoro } from '@/context/PomodoroContext';
import { useTasks } from '@/context/TasksContext';
import { useToast } from '@/context/ToastContext';
import { sameDay, startOfDay, toScheduledIso } from '@/lib/calendar/calendarDate';
import { categoryFadeColors } from '@/lib/color';
import { toastForError } from '@/lib/networkError';
import type { Task } from '@/types';

interface ToDoItemProps {
  task: Task;
  index?: number;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  /** Unused on native (react-native-sortables uses Sortable.Handle). Kept for callers. */
  drag?: () => void;
  /** Web: up and down buttons instead of drag. */
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
  const { colors, styles } = useTodoItemStyles();
  const { showToast } = useToast();
  const { categories, tags: allTags, updateTask, setTaskScheduled } = useTasks();
  const { activeTaskId, canStart, startPomo, endPomo } = usePomodoro();

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const isPomoActive = activeTaskId === task.id;

  const category = task.category;
  const tags = task.tags ?? [];
  const CategoryIconComp = category ? getCategoryIcon(category.icon) : null;

  const dueDate = task.scheduled ? new Date(task.scheduled) : null;
  const todayStart = startOfDay(new Date());
  const isToday = dueDate ? sameDay(dueDate, todayStart) : false;
  const isPast = dueDate ? startOfDay(dueDate) < todayStart : false;

  const categoryGradientColors = category ? categoryFadeColors(category.color) : null;

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
    onDelete(task.id);
    return true;
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
        accessibilityRole="button"
        accessibilityLabel={task.title}
        accessibilityHint={drag ? 'Opens details. Long press to reorder' : 'Show task details'}
        style={({ pressed, hovered }) => [
          styles.todoItem,
          category && !isMobile ? styles.hasCategory : null,
          hovered ? styles.itemHovered : null,
          pressed ? styles.pressed : null,
        ]}>
        {categoryGradientColors && (
          <LinearGradient
            colors={[...categoryGradientColors]}
            start={{ x: 0.35, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.categoryGradient}
            pointerEvents="none"
          />
        )}

        {!isMobile && CategoryIconComp && category && (
          <View style={[styles.categoryBgIcon, { opacity: 0.14 }]} pointerEvents="none">
            <CategoryIconComp size={44} strokeWidth={1.5} color={category.color} />
          </View>
        )}

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

          <TaskCheckbox done={task.done} styles={styles} onPress={handleToggleDone} />

          <View style={styles.todoBody}>
            <View style={styles.todoText}>
              <Text
                style={[styles.titleText, task.done && styles.done]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {task.title}
              </Text>
            </View>
            <TaskTagChips tags={tags} styles={styles} />
          </View>

          {!isMobile && (
            <View style={styles.todoIndicators}>
              {!task.done && dueDate ? (
                <DueDateBadge
                  date={dueDate}
                  isToday={isToday}
                  isPast={isPast}
                  showHover
                  styles={styles}
                  onPress={openCalendar}
                />
              ) : null}
            </View>
          )}

          {!isMobile && (
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
              onDelete={handleDelete}
            />
          )}

          {isMobile && (
            <TaskMobileTrailing
              done={task.done}
              dueDate={dueDate}
              isToday={isToday}
              isPast={isPast}
              category={category}
              CategoryIconComp={CategoryIconComp}
              colors={colors}
              styles={styles}
              onOpenCalendar={openCalendar}
              onOpenActions={() => setShowMobileActions(true)}
              onDelete={handleDelete}
            />
          )}
        </View>

        {isMobile && isPomoActive ? (
          <View style={styles.mobileMetaRow}>
            <PomodoroTimer taskId={task.id} />
          </View>
        ) : null}
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
        colors={colors}
        styles={styles}
        onClose={() => setShowMobileActions(false)}
        onStartPomodoro={handleStartPomodoro}
        onOpenCalendar={openCalendar}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
