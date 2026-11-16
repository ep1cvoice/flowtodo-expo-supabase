import { strings } from '@/shared/lib/strings';
import { Pressable, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import TomatoIcon from '@/features/pomodoro/components/TomatoIcon';
import { useTheme } from '@/shared/providers/ThemeContext';
import TaskDateButton from '@/features/tasks/components/item/taskDetail/TaskDateButton';
import TaskFullscreenButton from '@/features/tasks/components/item/taskDetail/TaskFullscreenButton';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';

interface Props {
  dueDate: Date | null;
  showCalendarIcon: boolean;
  onOpenCalendar: () => void;
  showAlarmIcon: boolean;
  fullscreen: boolean;
  styles: TaskDetailStyles;
  onPressOutside: () => void;
  onArmSkipSave: () => void;
  onCommitFromOutside: () => void;
  onStartPomodoro: () => void;
  onToggleFullscreen: () => void;
  onDelete: () => void;
}

// Action bar at the bottom of the sheet: pomodoro on the left, delete on the right.
export default function TaskDetailFooter({
  dueDate,
  showCalendarIcon,
  onOpenCalendar,
  showAlarmIcon,
  fullscreen,
  styles,
  onPressOutside,
  onArmSkipSave,
  onCommitFromOutside,
  onStartPomodoro,
  onToggleFullscreen,
  onDelete,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable accessible={false} onPress={onPressOutside} style={styles.footer}>
      <View pointerEvents="box-none" style={styles.footerRow}>
        <View style={styles.footerGroup}>
          <TaskDateButton
            dueDate={dueDate}
            showCalendarIcon={showCalendarIcon}
            styles={styles}
            onPress={() => {
              onCommitFromOutside();
              onOpenCalendar();
            }}
          />
          {showAlarmIcon ? (
            <Pressable
              onPress={() => {
                onCommitFromOutside();
                onStartPomodoro();
              }}
              hitSlop={4}
              style={({ pressed, hovered }) => [
                styles.iconBtn,
                (hovered || pressed) && styles.iconBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={strings.tasks.startPomodoro}>
              <TomatoIcon size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
          <TaskFullscreenButton
            fullscreen={fullscreen}
            styles={styles}
            onPress={() => {
              onCommitFromOutside();
              onToggleFullscreen();
            }}
          />
        </View>

        <Pressable
          id="skip-desc-save-delete"
          onPressIn={onArmSkipSave}
          onPress={onDelete}
          hitSlop={4}
          style={({ pressed, hovered }) => [
            styles.iconBtn,
            (hovered || pressed) && styles.deleteBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={strings.tasks.deleteTask}>
          <Trash2 size={18} strokeWidth={2.2} color={colors.red} />
        </Pressable>
      </View>
    </Pressable>
  );
}
