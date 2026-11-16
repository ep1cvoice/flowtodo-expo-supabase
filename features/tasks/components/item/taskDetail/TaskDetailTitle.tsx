import { strings } from '@/shared/lib/strings';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/shared/providers/ThemeContext';
import { useTodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import { useToast } from '@/shared/providers/ToastContext';
import { validateTaskTitle } from '@/features/tasks/lib/taskValidation';
import type { Task } from '@/types';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import { webTextCursor } from '@/features/tasks/components/item/taskDetail/taskDetailUtils';

interface Props {
  task: Task;
  styles: TaskDetailStyles;
  onSaveTitle: (title: string) => void | Promise<unknown>;
  onArmSkipSave: () => void;
  onToggleComplete: () => void;
}

export default function TaskDetailTitle({
  task,
  styles,
  onSaveTitle,
  onArmSkipSave,
  onToggleComplete,
}: Props) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { styles: todoStyles } = useTodoItemStyles();
  const [draft, setDraft] = useState(task.title);
  const focusedRef = useRef(false);

  // Follow external title changes unless the user is typing.
  useEffect(() => {
    if (!focusedRef.current) setDraft(task.title);
  }, [task.title]);

  const commit = () => {
    focusedRef.current = false;
    const next = draft.trim();
    if (next === task.title) {
      setDraft(task.title);
      return;
    }
    const error = validateTaskTitle(next);
    if (error) {
      showToast(error);
      setDraft(task.title);
      return;
    }
    setDraft(next);
    void onSaveTitle(next);
  };

  return (
    <View style={styles.titleRow}>
      <Pressable
        id="skip-desc-save-complete"
        onPressIn={onArmSkipSave}
        onPress={onToggleComplete}
        hitSlop={8}
        style={({ pressed, hovered }) => [
          todoStyles.todoCheckbox,
          task.done && todoStyles.checked,
          hovered && !task.done && todoStyles.checkboxHovered,
          hovered && task.done && todoStyles.checkboxCheckedHovered,
          pressed && todoStyles.controlPressed,
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        accessibilityLabel={task.done ? strings.tasks.markIncomplete : strings.tasks.markCompleted}
      >
        {task.done ? <Text style={todoStyles.checkmark}>✓</Text> : null}
      </Pressable>
      <View id="task-title-field" style={styles.titleWrap}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={commit}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          maxLength={50}
          selectionColor={colors.primary}
          cursorColor={colors.textPrimary}
          underlineColorAndroid="transparent"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={strings.tasks.taskTitleInput}
          style={[styles.title, styles.titleInput, webTextCursor, task.done && styles.done]}
        />
      </View>
    </View>
  );
}
