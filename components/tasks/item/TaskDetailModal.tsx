import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { AlarmClock, Calendar, Check, Pencil, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PomodoroTimer from '@/components/tasks/pomodoro/PomodoroTimer';
import SheetFrame from '@/components/ui/SheetFrame';
import { getCategoryIcon } from '@/constants/categoryIcons';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { hexToRgb } from '@/lib/color';
import { webInteractive } from '@/utils/pressableWeb';
import type { Task } from '@/types';

interface TaskDetailModalProps {
  visible: boolean;
  task: Task;
  canStart: boolean;
  isPomoActive: boolean;
  onClose: () => void;
  onDelete: () => void | Promise<void>;
  onEdit: () => void;
  onOpenCalendar: () => void;
  onStartPomodoro: () => void;
  onToggleComplete: () => void | Promise<void>;
}

function formatDetailDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function tagTint(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function TaskDetailModal({
  visible,
  task,
  canStart,
  isPomoActive,
  onClose,
  onDelete,
  onEdit,
  onOpenCalendar,
  onStartPomodoro,
  onToggleComplete,
}: TaskDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tags = task.tags ?? [];
  const category = task.category;
  const CategoryIcon = category ? getCategoryIcon(category.icon) : null;
  const description = task.description?.trim() ?? '';
  const dueDate = task.scheduled ? new Date(task.scheduled) : null;
  const showPomodoro = !task.done && (isPomoActive || canStart);
  const hasDetails = tags.length > 0 || !!dueDate || !!description;

  return (
    <SheetFrame
      visible={visible}
      onClose={onClose}
      header="none"
      centered
      cardStyle={styles.card}>
      <View
        style={[
          styles.header,
          category ? { backgroundColor: tagTint(category.color, 0.3) } : null,
        ]}>
        {CategoryIcon && category ? (
          <CategoryIcon size={22} strokeWidth={2} color={category.color} />
        ) : null}
        <View style={styles.titleWrap}>
          <Text style={[styles.title, task.done && styles.done]}>{task.title}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel="Close">
          <X size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {hasDetails ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {tags.length > 0 ? (
              <View style={styles.tagWrap}>
                {tags.map((tag) => (
                  <View
                    key={tag.id}
                    style={[
                      styles.tagChip,
                      {
                        borderColor: tag.color,
                        backgroundColor: tagTint(tag.color, 0.14),
                      },
                    ]}>
                    <Text style={[styles.tagChipText, { color: tag.color }]}>#{tag.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {dueDate ? (
              <View style={styles.dateRow}>
                <Calendar size={15} strokeWidth={2} color={colors.textMuted} />
                <Text style={styles.dateText}>{formatDetailDate(dueDate)}</Text>
              </View>
            ) : null}

            {description ? (
              <>
                <View style={styles.divider} />
                <Text style={[styles.description, task.done && styles.done]}>{description}</Text>
              </>
            ) : null}
          </ScrollView>
        ) : null}

        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
          <Pressable
            onPress={() => {
              void onDelete();
            }}
            style={({ pressed, hovered }) => [
              styles.deleteBtn,
              (hovered || pressed) && styles.deleteBtnPressed,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Delete task">
            <Trash2 size={16} strokeWidth={2.2} color={colors.red} />
          </Pressable>

          <View style={styles.footerActions}>
            {!task.done ? (
              <Pressable
                onPress={onOpenCalendar}
                style={({ pressed, hovered }) => [
                  styles.actionBtn,
                  (hovered || pressed) && styles.actionBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Set due date">
                <Calendar size={15} strokeWidth={2.2} color={colors.textPrimary} />
                <Text style={styles.actionLabel} numberOfLines={1}>
                  Calendar
                </Text>
              </Pressable>
            ) : null}

            {showPomodoro ? (
              isPomoActive ? (
                <PomodoroTimer taskId={task.id} />
              ) : (
                <Pressable
                  onPress={onStartPomodoro}
                  style={({ pressed, hovered }) => [
                    styles.actionBtn,
                    (hovered || pressed) && styles.actionBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Start pomodoro">
                  <AlarmClock size={15} strokeWidth={2.2} color={colors.textPrimary} />
                  <Text style={styles.actionLabel} numberOfLines={1}>
                    Pomodoro
                  </Text>
                </Pressable>
              )
            ) : null}

            <Pressable
              onPress={onEdit}
              style={({ pressed, hovered }) => [
                styles.actionBtn,
                (hovered || pressed) && styles.actionBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit task">
              <Pencil size={15} strokeWidth={2.2} color={colors.textPrimary} />
              <Text style={styles.actionLabel} numberOfLines={1}>
                Edit
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void onToggleComplete();
              }}
              style={({ pressed, hovered }) => [
                styles.completeBtn,
                (hovered || pressed) && styles.completeBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={task.done ? 'Mark as incomplete' : 'Mark as completed'}>
              <Check size={16} strokeWidth={2.4} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </SheetFrame>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      maxHeight: '85%',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.bgSurface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 24,
    },
    done: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    content: {
      flexShrink: 1,
    },
    scroll: {
      flexShrink: 1,
    },
    body: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      gap: 12,
    },
    tagWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    tagChip: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1.5,
    },
    tagChipText: {
      fontSize: 13,
      fontWeight: '600',
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      opacity: 0.55,
    },
    dateText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderColor,
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 12,
      gap: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
    },
    footerActions: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'nowrap',
      gap: 6,
      minWidth: 0,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgTodoItem,
      flexShrink: 1,
      ...webInteractive,
    },
    actionBtnPressed: {
      backgroundColor: colors.bgCardHover,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
      flexShrink: 1,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.red,
      flexShrink: 0,
      ...webInteractive,
    },
    deleteBtnPressed: {
      backgroundColor: colors.sidebarLogoutHover,
    },
    completeBtn: {
      width: 52,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      flexShrink: 0,
      ...webInteractive,
    },
    completeBtnPressed: {
      opacity: 0.88,
    },
  });
}
