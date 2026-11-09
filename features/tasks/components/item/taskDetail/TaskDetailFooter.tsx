import { strings } from '@/shared/lib/strings';
import { Pressable, Text, View } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';

interface Props {
  done: boolean;
  styles: TaskDetailStyles;
  onPressOutside: () => void;
  onArmSkipSave: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
}

export default function TaskDetailFooter({
  done,
  styles,
  onPressOutside,
  onArmSkipSave,
  onDelete,
  onToggleComplete,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable accessible={false} onPress={onPressOutside} style={styles.footer}>
      <View pointerEvents="box-none" style={styles.footerRow}>
        <Pressable
          id="skip-desc-save-delete"
          onPressIn={onArmSkipSave}
          onPress={onDelete}
          style={({ pressed, hovered }) => [
            styles.deleteBtn,
            (hovered || pressed) && styles.deleteBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={strings.tasks.deleteTask}>
          <Trash2 size={18} strokeWidth={2.2} color={colors.red} />
        </Pressable>

        <Pressable
          id="skip-desc-save-complete"
          onPressIn={onArmSkipSave}
          onPress={onToggleComplete}
          style={({ pressed, hovered }) => [
            styles.completeBtn,
            (hovered || pressed) && styles.completeBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={done ? strings.tasks.markIncomplete : strings.tasks.markCompleted}>
          <Check size={15} strokeWidth={2.4} color="#fff" />
          <Text style={styles.completeBtnText} numberOfLines={1}>
            {strings.tasks.completedLabel}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
