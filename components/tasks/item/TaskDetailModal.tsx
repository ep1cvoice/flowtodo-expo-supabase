import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { AlarmClock, Calendar, Check, Trash2, X } from 'lucide-react-native';
import DueDateBadge from '@/components/tasks/item/DueDateBadge';
import { useTodoItemStyles } from '@/components/tasks/item/todoItemStyles';
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
  onOpenCalendar,
  onStartPomodoro,
  onToggleComplete,
}: TaskDetailModalProps) {
  const { colors, isDark } = useTheme();
  const { styles: todoStyles } = useTodoItemStyles();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const tags = task.tags ?? [];
  const category = task.category;
  const CategoryIcon = category ? getCategoryIcon(category.icon) : null;
  const description = task.description?.trim() ?? '';
  const dueDate = task.scheduled ? new Date(task.scheduled) : null;
  const showPomodoro = !task.done && (isPomoActive || canStart);
  const showCalendarIcon = !task.done && !dueDate;
  const showAlarmIcon = showPomodoro && !isPomoActive;

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
        <View style={[styles.meta, description ? styles.metaDivider : null]}>
          <View style={styles.topRow}>
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
              {dueDate ? (
                <DueDateBadge date={dueDate} styles={todoStyles} onPress={onOpenCalendar} />
              ) : null}
            </View>
            {showCalendarIcon || showAlarmIcon ? (
              <View style={styles.iconGroup}>
                {showCalendarIcon ? (
                  <Pressable
                    onPress={onOpenCalendar}
                    style={({ pressed, hovered }) => [
                      styles.iconBtn,
                      (hovered || pressed) && styles.iconBtnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Set due date">
                    <Calendar size={16} strokeWidth={2.2} color={colors.textSecondary} />
                  </Pressable>
                ) : null}
                {showAlarmIcon ? (
                  <Pressable
                    onPress={onStartPomodoro}
                    style={({ pressed, hovered }) => [
                      styles.iconBtn,
                      (hovered || pressed) && styles.iconBtnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Start pomodoro">
                    <AlarmClock size={16} strokeWidth={2.2} color={colors.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
          {isPomoActive ? (
            <View style={styles.timerRow}>
              <PomodoroTimer taskId={task.id} />
            </View>
          ) : null}
        </View>
        {description ? (
          <ScrollView
            style={[styles.scroll, styles.descriptionSection]}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <Text style={[styles.description, task.done && styles.done]}>{description}</Text>
          </ScrollView>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Pressable
              onPress={() => {
                void onDelete();
              }}
              style={({ pressed, hovered }) => [
                styles.deleteBtn,
                (hovered || pressed) && styles.deleteBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete task">
              <Trash2 size={18} strokeWidth={2.2} color={colors.red} />
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
              <Check size={15} strokeWidth={2.4} color="#fff" />
              <Text style={styles.completeBtnText} numberOfLines={1}>
                Completed
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SheetFrame>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
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
    meta: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 8,
    },
    metaDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderColor,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    timerRow: {
      alignItems: 'flex-start',
    },
    iconGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: 2,
      marginLeft: 'auto',
      maxWidth: '100%',
    },
    body: {
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 8,
    },
    tagWrap: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 0,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    tagChip: {
      minHeight: 29,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1.5,
      justifyContent: 'center',
    },
    tagChipText: {
      fontSize: 13,
      fontWeight: '600',
    },
    descriptionSection: {
      flexGrow: 1,
      paddingVertical: 8,
      backgroundColor: isDark ? '#011816' : '#e7e9ea',
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderColor,
      backgroundColor: isDark ? colors.bgSurface : '#f3f5f4',
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    iconBtn: {
      width: 29,
      height: 29,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      ...webInteractive,
    },
    iconBtnPressed: {
      backgroundColor: colors.bgCardHover,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      ...webInteractive,
    },
    deleteBtnPressed: {
      backgroundColor: colors.sidebarLogoutHover,
    },
    completeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    completeBtnPressed: {
      opacity: 0.88,
    },
    completeBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
  });
}
