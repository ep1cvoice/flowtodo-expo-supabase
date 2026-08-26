import { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { ArrowUpDown, Check } from 'lucide-react-native';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import {
  TASK_SORT_HINTS,
  TASK_SORT_LABELS,
  TASK_SORT_MODES,
  type TaskSortMode,
} from '@/lib/taskSort';
import SheetFrame from '@/components/ui/SheetFrame';
import { webInteractive } from '@/utils/pressableWeb';

interface TaskSortToggleProps {
  mode: TaskSortMode;
  onPress: () => void;
}

export function TaskSortToggle({ mode, onPress }: TaskSortToggleProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const active = mode !== 'manual';

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
      accessibilityLabel={`Sort: ${TASK_SORT_LABELS[mode]}`}
      accessibilityState={{ selected: active }}>
      <ArrowUpDown
        size={16}
        color={active ? colors.primary : colors.textSecondary}
        strokeWidth={2.2}
      />
    </Pressable>
  );
}

interface TaskSortSheetProps {
  visible: boolean;
  mode: TaskSortMode;
  onSelect: (mode: TaskSortMode) => void;
  onClose: () => void;
}

export default function TaskSortSheet({
  visible,
  mode,
  onSelect,
  onClose,
}: TaskSortSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SheetFrame
      visible={visible}
      onClose={onClose}
      title="Sort tasks"
      compactHeader
      cardStyle={styles.card}>
      <View style={styles.body}>
            {TASK_SORT_MODES.map((option) => {
              const selected = option === mode;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}
                  style={({ pressed, hovered }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    (hovered || pressed) && !selected && styles.optionHovered,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={TASK_SORT_LABELS[option]}>
                  <View style={styles.optionTextCol}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {TASK_SORT_LABELS[option]}
                    </Text>
                    <Text style={styles.optionHint}>{TASK_SORT_HINTS[option]}</Text>
                  </View>
                  {selected ? <Check size={18} color={colors.primary} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed, hovered }) => [
                styles.doneBtn,
                (hovered || pressed) && styles.doneBtnPressed,
              ]}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
    </SheetFrame>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
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
    },
    card: {
      maxHeight: '85%',
      overflow: 'hidden',
    },
    body: {
      padding: 16,
      gap: 8,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      ...webInteractive,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    optionHovered: {
      backgroundColor: colors.todoHighlight,
    },
    optionTextCol: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    optionLabelSelected: {
      color: colors.primary,
    },
    optionHint: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
    },
    footer: {
      padding: 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    doneBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    doneBtnPressed: {
      backgroundColor: colors.primaryHover,
    },
    doneBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
    },
  });
}
