import { strings } from '@/shared/lib/strings';
import { Pressable, View } from 'react-native';
import { Calendar, Trash2 } from 'lucide-react-native';
import TomatoIcon from '@/features/pomodoro/components/TomatoIcon';
import type { TodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import type { AppColors } from '@/shared/constants/theme';

interface TaskDesktopActionsProps {
  taskId: number;
  done: boolean;
  isPomoActive: boolean;
  canStart: boolean;
  colors: AppColors;
  styles: TodoItemStyles;
  onStartPomodoro: () => void;
  onOpenCalendar: () => void;
  onDelete: () => void;
}

export default function TaskDesktopActions({
  done,
  isPomoActive,
  canStart,
  colors,
  styles,
  onStartPomodoro,
  onOpenCalendar,
  onDelete,
}: TaskDesktopActionsProps) {
  return (
    <View style={styles.todoActions}>
      {!done && (
        <>
          {!isPomoActive && canStart ? (
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
              accessibilityLabel={strings.tasks.startPomodoro}>
              <TomatoIcon size={18} color={colors.textSecondary} />
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
