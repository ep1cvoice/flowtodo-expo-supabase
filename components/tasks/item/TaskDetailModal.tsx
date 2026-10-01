import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  type TextStyle,
} from 'react-native';
import { AlarmClock, Calendar, Check, Trash2, X } from 'lucide-react-native';
import CalendarModal from '@/components/tasks/calendar/CalendarModal';
import DueDateBadge from '@/components/tasks/item/DueDateBadge';
import { useTodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import PomodoroTimer from '@/components/tasks/pomodoro/PomodoroTimer';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SheetFrame from '@/components/ui/SheetFrame';
import { getCategoryIcon } from '@/constants/categoryIcons';
import type { AppColors } from '@/constants/theme';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { toScheduledIso } from '@/lib/calendar/calendarDate';
import { hexToRgb } from '@/lib/color';
import { toastForError } from '@/lib/networkError';
import { webInteractive } from '@/utils/pressableWeb';
import type { Task } from '@/types';

const DESCRIPTION_PLACEHOLDER = 'Click here to write a description';
const DESC_LINE_HEIGHT = 22;
const DESC_MAX_HEIGHT = 176;
const DESC_CHARS_PER_LINE = 46;

function descriptionHeight(text: string) {
  const source = text.length > 0 ? text : DESCRIPTION_PLACEHOLDER;
  const lines = source.split('\n').reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / DESC_CHARS_PER_LINE));
  }, 0);
  return Math.min(DESC_MAX_HEIGHT, lines * DESC_LINE_HEIGHT);
}

type MarkerNode = {
  nodeType?: number;
  parentElement?: MarkerNode | null;
  closest?: (selector: string) => MarkerNode | null;
};

function pointerMarker(target: unknown): 'field' | 'calendar' | 'skip' | 'outside' | null {
  if (!target || typeof target !== 'object') return null;
  const node = target as MarkerNode;
  const el = node.nodeType === 3 ? node.parentElement : node;
  if (!el?.closest) return null;
  if (el.closest('#task-desc-field')) return 'field';
  if (el.closest('#open-task-calendar')) return 'calendar';
  if (el.closest('[id^="skip-desc-save"]')) return 'skip';
  return 'outside';
}

const webTextCursor: TextStyle =
  Platform.OS === 'web'
    ? ({ cursor: 'text', outlineStyle: 'none' } as unknown as TextStyle)
    : {};

interface TaskDetailModalProps {
  visible: boolean;
  task: Task;
  canStart: boolean;
  isPomoActive: boolean;
  onClose: () => void;
  onDelete: () => void | boolean | Promise<void | boolean>;
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
  onStartPomodoro,
  onToggleComplete,
}: TaskDetailModalProps) {
  const { colors, isDark } = useTheme();
  const { updateTask, setTaskScheduled } = useTasks();
  const { showToast } = useToast();
  const { styles: todoStyles } = useTodoItemStyles();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const tags = task.tags ?? [];
  const category = task.category;
  const CategoryIcon = category ? getCategoryIcon(category.icon) : null;
  const [draft, setDraft] = useState(task.description ?? '');
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const descHeight = descriptionHeight(draft);
  const inputRef = useRef<TextInput>(null);
  const draftRef = useRef(draft);
  const focusedRef = useRef(false);
  const savingRef = useRef(false);
  const skipSaveRef = useRef(false);
  const lastSavedRef = useRef((task.description ?? '').trim());
  draftRef.current = draft;
  const dueDate = task.scheduled ? new Date(task.scheduled) : null;
  const showPomodoro = !task.done && (isPomoActive || canStart);
  const showCalendarIcon = !task.done && !dueDate;
  const showAlarmIcon = showPomodoro && !isPomoActive;

  useEffect(() => {
    if (focusedRef.current) return;
    const next = task.description ?? '';
    setDraft(next);
    lastSavedRef.current = next.trim();
  }, [task.id, task.description]);

  useEffect(() => {
    if (!visible) setConfirmDelete(false);
  }, [visible]);

  const saveDescription = async () => {
    const next = draftRef.current.trim();
    if (next === lastSavedRef.current || savingRef.current) return;

    savingRef.current = true;
    try {
      await updateTask(task.id, {
        title: task.title,
        description: next,
        categoryId: task.categoryId,
        tagIds: tags.map((tag) => tag.id),
      });
      lastSavedRef.current = next;
      if (!focusedRef.current) setDraft(next);
    } catch (err) {
      console.warn('Failed to update description:', err);
      showToast(toastForError(err, 'Could not save description.'), 'error');
      if (!focusedRef.current) setDraft(task.description ?? '');
    } finally {
      savingRef.current = false;
    }
  };

  const handleClose = () => {
    void saveDescription();
    onClose();
  };

  const dismissInput = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const dismissInputSoon = () => {
    setTimeout(() => {
      dismissInput();
      skipSaveRef.current = false;
    }, 0);
  };

  const openDetailCalendar = () => {
    setTimeout(() => setShowCalendar(true), 0);
  };

  const handleClearDate = async () => {
    try {
      await setTaskScheduled(task.id, null);
      setShowCalendar(false);
    } catch (err) {
      showToast(toastForError(err, 'Could not update date.'), 'error');
    }
  };

  const handleConfirmDate = async (date: Date) => {
    try {
      await setTaskScheduled(task.id, toScheduledIso(date));
      setShowCalendar(false);
    } catch (err) {
      showToast(toastForError(err, 'Could not update date.'), 'error');
    }
  };

  const commitFromOutside = () => {
    dismissInputSoon();
    if (skipSaveRef.current) return;
    void saveDescription();
  };

  const armSkipSave = () => {
    skipSaveRef.current = true;
    dismissInputSoon();
  };

  return (
    <SheetFrame
      visible={visible}
      onClose={handleClose}
      keyboardAvoiding
      header="none"
      centered
      cardStyle={styles.card}
      accessory={
        <>
          <CalendarModal
            embedded
            visible={showCalendar}
            selected={dueDate}
            onClose={() => setShowCalendar(false)}
            onClear={() => {
              void handleClearDate();
            }}
            onConfirm={(date) => {
              void handleConfirmDate(date);
            }}
          />
          <ConfirmModal
            embedded
            visible={confirmDelete}
            title="Delete task?"
            message={`"${task.title}" will be permanently deleted.`}
            onClose={() => {
              setConfirmDelete(false);
              void saveDescription();
            }}
            onConfirm={async () => {
              const deleted = await onDelete();
              if (deleted !== false) setConfirmDelete(false);
            }}
          />
        </>
      }>
      <View
        style={styles.sheetBody}
        onPointerDownCapture={(event) => {
          const marker = pointerMarker(event.target);
          if (marker === 'field') return;
          if (marker === 'calendar') {
            openDetailCalendar();
            commitFromOutside();
            return;
          }
          if (marker === 'skip') {
            armSkipSave();
            return;
          }
          if (marker === 'outside') commitFromOutside();
        }}>
      <Pressable
        accessible={false}
        onPress={commitFromOutside}
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
        <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel="Close">
          <X size={20} color={colors.textMuted} />
        </Pressable>
      </Pressable>

      <View style={styles.content}>
        <View style={[styles.meta, styles.metaDivider]}>
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
                <View id="open-task-calendar">
                  <DueDateBadge
                    date={dueDate}
                    styles={todoStyles}
                    onPress={() => {
                      commitFromOutside();
                      openDetailCalendar();
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
                      commitFromOutside();
                      openDetailCalendar();
                    }}
                    hitSlop={8}
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
                    onPress={() => {
                      commitFromOutside();
                      onStartPomodoro();
                    }}
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
        <View id="task-desc-field" style={styles.descriptionField}>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onFocus={() => {
              focusedRef.current = true;
            }}
            onBlur={() => {
              focusedRef.current = false;
              if (skipSaveRef.current) return;
              void saveDescription();
            }}
            placeholder={DESCRIPTION_PLACEHOLDER}
            placeholderTextColor={colors.textMuted}
            multiline
            scrollEnabled={descHeight >= DESC_MAX_HEIGHT}
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            cursorColor={colors.textPrimary}
            selectionColor={colors.primary}
            style={[
              styles.descriptionInput,
              webTextCursor,
              { height: descHeight },
              task.done && styles.done,
            ]}
            accessibilityLabel="Task description"
          />
        </View>

        <Pressable accessible={false} onPress={commitFromOutside} style={styles.footer}>
          <View pointerEvents="box-none" style={styles.footerRow}>
            <Pressable
              id="skip-desc-save-delete"
              onPressIn={armSkipSave}
              onPress={() => {
                setShowCalendar(false);
                setConfirmDelete(true);
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
              id="skip-desc-save-complete"
              onPressIn={armSkipSave}
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
        </Pressable>
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
    sheetBody: {
      flexShrink: 1,
      width: '100%',
    },
    content: {
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
    descriptionField: {
      backgroundColor: isDark ? '#011816' : '#e7e9ea',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    descriptionInput: {
      margin: 0,
      padding: 0,
      borderWidth: 0,
      fontSize: 15,
      lineHeight: DESC_LINE_HEIGHT,
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
