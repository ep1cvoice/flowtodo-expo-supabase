import { strings } from '@/shared/lib/strings';
import type { RefObject } from 'react';
import { TextInput, View } from 'react-native';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import {
  DESCRIPTION_PLACEHOLDER,
  DESC_MAX_HEIGHT,
  descriptionHeight,
  webTextCursor,
} from '@/features/tasks/components/item/taskDetail/taskDetailUtils';

interface Props {
  inputRef: RefObject<TextInput | null>;
  value: string;
  done: boolean;
  styles: TaskDetailStyles;
  onChange: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export default function TaskDescriptionField({
  inputRef,
  value,
  done,
  styles,
  onChange,
  onFocus,
  onBlur,
}: Props) {
  const { colors } = useTheme();
  const height = descriptionHeight(value);

  return (
    <View id="task-desc-field" style={styles.descriptionField}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={DESCRIPTION_PLACEHOLDER}
        placeholderTextColor={colors.textMuted}
        multiline
        scrollEnabled={height >= DESC_MAX_HEIGHT}
        textAlignVertical="top"
        underlineColorAndroid="transparent"
        cursorColor={colors.textPrimary}
        selectionColor={colors.primary}
        style={[styles.descriptionInput, webTextCursor, { height }, done && styles.done]}
        accessibilityLabel={strings.tasks.taskDescription}
      />
    </View>
  );
}
