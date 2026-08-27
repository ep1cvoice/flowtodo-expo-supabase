import { Pressable, View } from 'react-native';
import { AlarmClock, Calendar, Pencil, Trash2 } from 'lucide-react-native';
import PomodoroTimer from '@/components/tasks/pomodoro/PomodoroTimer';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import type { AppColors } from '@/constants/theme';

interface TaskDesktopActionsProps {
  taskId: number;
  done: boolean;
  isPomoActive: boolean;
  canStart: boolean;
  colors: AppColors;
  styles: TodoItemStyles;
  onStartPomodoro: () => void;
  onOpenCalendar: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function TaskDesktopActions({
  taskId,
  done,
  isPomoActive,
  canStart,
  colors,
  styles,
  onStartPomodoro,
  onOpenCalendar,
  onEdit,
  onDelete,
}: TaskDesktopActionsProps) {
  return (
    <View style={styles.todoActions}>
      {!done && (
        <>
          {isPomoActive ? (
            <PomodoroTimer taskId={taskId} />
          ) : canStart ? (
            <Pressable
              style={({ pressed, hovered }) => [
                styles.todoActionBtn,
                (hovered || pressed) && styles.actionPressed,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onStartPomodoro();
              }}
              hitSlop={6}
              accessibilityLabel="Start pomodoro">
              <AlarmClock size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
          <Pressable
            style={({ pressed, hovered }) => [
              styles.todoActionBtn,
              (hovered || pressed) && styles.actionPressed,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onOpenCalendar();
            }}
            hitSlop={6}>
            <Calendar size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed, hovered }) => [
              styles.todoActionBtn,
              (hovered || pressed) && styles.actionPressed,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            hitSlop={6}>
            <Pencil size={18} color={colors.textSecondary} />
          </Pressable>
        </>
      )}
      <Pressable
        style={({ pressed, hovered }) => [
          styles.todoActionBtn,
          (hovered || pressed) && styles.actionPressed,
        ]}
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        hitSlop={6}>
        <Trash2 size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}
