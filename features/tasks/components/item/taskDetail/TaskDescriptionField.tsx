import { strings } from '@/shared/lib/strings';
import type { RefObject } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import { NotebookPen } from 'lucide-react-native';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import {
  DESCRIPTION_PLACEHOLDER,
  DESC_MAX_HEIGHT,
  descriptionHeight,
  webTextCursor,
} from '@/features/tasks/components/item/taskDetail/taskDetailUtils';

interface Props {
  inputRef: RefObject<TextInputInstance | null>;
  value: string;
  done: boolean;
  fullscreen?: boolean;
  styles: TaskDetailStyles;
  onChange: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export default function TaskDescriptionField({
  inputRef,
  value,
  done,
  fullscreen = false,
  styles,
  onChange,
  onFocus,
  onBlur,
}: Props) {
  const { colors } = useTheme();
  const height = descriptionHeight(value);

  return (
    <View
      id="task-desc-field"
      style={[styles.descriptionWrap, fullscreen && styles.descriptionWrapFull]}>
      <Pressable
        style={[styles.descriptionField, fullscreen && styles.descriptionFieldFull]} onPress={() => inputRef.current?.focus()}>
        {value.length === 0 ? (
          <View pointerEvents="none" style={styles.descriptionGlyph}>
            <NotebookPen size={44} strokeWidth={1.25} color={colors.textMuted} />
          </View>
        ) : null}
        <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={DESCRIPTION_PLACEHOLDER}
        placeholderTextColor={colors.textMuted}
        multiline
        scrollEnabled={fullscreen || height >= DESC_MAX_HEIGHT}
        textAlignVertical="top"
        underlineColorAndroid="transparent"
        cursorColor={colors.textPrimary}
        selectionColor={colors.primary}
        style={[
          styles.descriptionInput,
          webTextCursor,
          fullscreen ? styles.descriptionInputFull : { height },
          done && styles.done,
        ]}
        accessibilityLabel={strings.tasks.taskDescription}
        />
      </Pressable>
    </View>
  );
}
