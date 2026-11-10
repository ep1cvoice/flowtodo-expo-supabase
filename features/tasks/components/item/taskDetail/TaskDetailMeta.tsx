import { strings } from '@/shared/lib/strings';
import { Pressable, Text, View } from 'react-native';
import { AlarmClock, Calendar } from 'lucide-react-native';
import DueDateBadge from '@/features/tasks/components/item/DueDateBadge';
import { useTodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import PomodoroTimer from '@/features/pomodoro/components/PomodoroTimer';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { Task } from '@/types';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import { tagTint } from '@/features/tasks/components/item/taskDetail/taskDetailUtils';

interface Props {
  task: Task;
  dueDate: Date | null;
  showCalendarIcon: boolean;
  showAlarmIcon: boolean;
  isPomoActive: boolean;
  styles: TaskDetailStyles;
  onCommitFromOutside: () => void;
  onOpenCalendar: () => void;
  onStartPomodoro: () => void;
}

export default function TaskDetailMeta({
  task,
  dueDate,
  showCalendarIcon,
  showAlarmIcon,
  isPomoActive,
  styles,
  onCommitFromOutside,
  onOpenCalendar,
  onStartPomodoro,
}: Props) {
  const { colors } = useTheme();
  const { styles: todoStyles } = useTodoItemStyles();
  const tags = task.tags ?? [];

  return (
    <View style={[styles.meta, styles.metaDivider]}>
      <View style={styles.topRow}>
        <View style={styles.tagWrap}>
          {tags.map((tag) => (
            <View
              key={tag.id}
              style={[
                styles.tagChip,
                { borderColor: tag.color, backgroundColor: tagTint(tag.color, 0.14) },
              ]}>
              <Text style={[styles.tagChipText, { color: tag.color }]}>#{tag.name}</Text>
            </View>
          ))}
          {dueDate ? (
            <View id="open-task-calendar">
              <DueDateBadge
                date={dueDate}
                styles={todoStyles}
                onPress={() => {
                  onCommitFromOutside();
                  onOpenCalendar();
                }}
              />
            </View>
          ) : null}
        </View>
        {showCalendarIcon || showAlarmIcon ? (
          <View style={styles.iconGroup}>
            {showCalendarIcon ? (
              <Pressable
                id="open-task-calendar"
                onPress={(event) => {
                  event.stopPropagation();
                  onCommitFromOutside();
                  onOpenCalendar();
                }}
                hitSlop={8}
                style={({ pressed, hovered }) => [
                  styles.iconBtn,
                  (hovered || pressed) && styles.iconBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={strings.tasks.setDueDate}>
                <Calendar size={16} strokeWidth={2.2} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            {showAlarmIcon ? (
              <Pressable
                onPress={() => {
                  onCommitFromOutside();
                  onStartPomodoro();
                }}
                style={({ pressed, hovered }) => [
                  styles.iconBtn,
                  (hovered || pressed) && styles.iconBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={strings.tasks.startPomodoro}>
                <AlarmClock size={16} strokeWidth={2.2} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {isPomoActive ? (
        <View style={styles.timerRow}>
          <PomodoroTimer taskId={task.id} taskTitle={task.title} />
        </View>
      ) : null}
    </View>
  );
}
