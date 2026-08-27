import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  Keyboard,
  type TextInput as TextInputType,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

export const TASK_LIST_INSET = 10;
const OPEN_HEIGHT = 40;

interface TaskSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  visible: boolean;
  placeholder?: string;
}

export default function TaskSearchBar({
  value,
  onChangeText,
  visible,
  placeholder = 'Search tasks…',
}: TaskSearchBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasValue = value.trim().length > 0;
  const inputRef = useRef<TextInputType>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const prevVisibleRef = useRef(false);
  const [inputMounted, setInputMounted] = useState(false);

  useEffect(() => {
    const opening = visible && !prevVisibleRef.current;
    const closing = !visible && prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (opening) {
      setInputMounted(true);
    }

    if (closing) {
      inputRef.current?.blur();
      Keyboard.dismiss();
    }

    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      if (opening) {
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (closing) {
        setInputMounted(false);
      }
    });
  }, [visible, progress]);

  const height = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, OPEN_HEIGHT],
  });
  
  const marginBottom = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TASK_LIST_INSET],
  });
  const opacity = progress;

  return (
    <Animated.View
      style={[styles.outer, { height, marginBottom, opacity }]}
      pointerEvents={visible ? 'auto' : 'none'}>
      <View style={styles.wrap}>
        <Search size={16} color={colors.textMuted} strokeWidth={2.2} />
        {inputMounted ? (
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={false}
            editable={visible}
            showSoftInputOnFocus={visible}
            clearButtonMode="never"
            returnKeyType="search"
            accessibilityLabel="Search tasks"
          />
        ) : (
          <View style={styles.input} />
        )}
        {inputMounted && hasValue ? (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={8}
            style={({ pressed, hovered }) => [
              styles.clearBtn,
              (hovered || pressed) && styles.clearBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <X size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

interface TaskSearchToggleProps {
  open: boolean;
  hasQuery?: boolean;
  onPress: () => void;
}

export function TaskSearchToggle({ open, hasQuery = false, onPress }: TaskSearchToggleProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const active = open || hasQuery;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed, hovered }) => [
        styles.toggleBtn,
        active && styles.toggleBtnActive,
        (hovered || pressed) && styles.toggleBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={open ? 'Hide search' : 'Show search'}
      accessibilityState={{ selected: open }}>
      <Search size={16} color={active ? colors.primary : colors.textSecondary} strokeWidth={2.2} />
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    outer: {
      width: '100%',
      overflow: 'hidden',
    },
    wrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
    },
    input: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 0,
      margin: 0,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    clearBtn: {
      padding: 4,
      borderRadius: 8,
      ...webInteractive,
    },
    clearBtnPressed: {
      backgroundColor: colors.todoHighlight,
    },
    toggleBtn: {
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      ...webInteractive,
    },
    toggleBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    toggleBtnPressed: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
  });
}
