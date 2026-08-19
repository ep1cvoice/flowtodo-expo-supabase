import { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlarmClock,
  Briefcase,
  Book,
  Calendar,
  Camera,
  Car,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Code,
  Coffee,
  Dumbbell,
  Gamepad2,
  Globe,
  Heart,
  Home,
  Leaf,
  Music,
  Palette,
  Pencil,
  Plane,
  ShoppingCart,
  Star,
  Target,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import CalendarModal from '@/components/tasks/CalendarModal';
import EditTaskModal from '@/components/tasks/EditTaskModal';
import PomodoroTimer from '@/components/tasks/PomodoroTimer';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { usePomodoro } from '@/context/PomodoroContext';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { toastForError } from '@/lib/networkError';
import type { CategoryIcon, Task } from '@/types';
import { webInteractive } from '@/utils/pressableWeb';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ICON_MAP: Record<CategoryIcon, LucideIcon> = {
  Briefcase,
  Home,
  Book,
  Heart,
  Star,
  ShoppingCart,
  Dumbbell,
  Code,
  Music,
  Camera,
  Plane,
  Car,
  Coffee,
  Gamepad2,
  Palette,
  Globe,
  Leaf,
  Zap,
  Target,
  Users,
};

function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '');
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

interface ToDoItemProps {
  task: Task;
  index?: number;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  /** Native: long-press the whole row to start DraggableFlatList drag. */
  drag?: () => void;
  /** Web: up and down buttons instead of drag (draggable-flatlist is poor on web). */
  showReorderButtons?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function ToDoItem({
  task,
  index = 0,
  onToggle,
  onDelete,
  drag,
  showReorderButtons = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
}: ToDoItemProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < tokens.desktopBreakpoint;
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { categories, tags: allTags, updateTask, setTaskScheduled } = useTasks();
  const { activeTaskId, canStart, startPomo, endPomo } = usePomodoro();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const isPomoActive = activeTaskId === task.id;

  const category = task.category;
  const tags = task.tags ?? [];
  const CategoryIconComp =
    category ? ICON_MAP[category.icon as CategoryIcon] ?? Briefcase : null;

  const dueDate = task.scheduled ? new Date(task.scheduled) : null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const isToday = (() => {
    if (!dueDate) return false;
    const d = new Date(dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === todayStart.getTime();
  })();

  const isPast = (() => {
    if (!dueDate) return false;
    const d = new Date(dueDate);
    d.setHours(0, 0, 0, 0);
    return d < todayStart;
  })();

  const formatShortDate = (date: Date) =>
    date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  const categoryGradientColors = category
    ? (() => {
        const { r, g, b } = hexToRgb(category.color);
        return [`rgba(${r},${g},${b},0)`, `rgba(${r},${g},${b},0.3)`] as const;
      })()
    : null;

  const hasDescription = !!task.description?.trim();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((v) => !v);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleStartPomodoro = () => {
    if (!canStart || task.done) return;
    startPomo(task.id).catch((err) => {
      showToast(toastForError(err, 'Could not start pomodoro.'), 'error');
    });
  };

  const handleToggleDone = async () => {
    if (isPomoActive) {
      try {
        await endPomo();
      } catch (err) {
        showToast(toastForError(err, 'Could not stop pomodoro.'), 'error');
        return; // nie kontynuuj toggle, jeśli endPomo zawiodło
      }
    }
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onToggle(task.id);
  };

  const handleDelete = async () => {
    if (isPomoActive) {
      try {
        await endPomo();
      } catch (err) {
        showToast(toastForError(err, 'Could not stop pomodoro.'), 'error');
        return;
      }
    }
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    onDelete(task.id);
  };

  const handleItemPress = () => {
    if (!hasDescription) return;
    toggleExpand();
  };

  const openCalendar = () => {
    setShowCalendarModal(true);
  };

  const handleClearDate = async () => {
    try {
      await setTaskScheduled(task.id, null);
      setShowCalendarModal(false);
    } catch (err) {
      showToast(toastForError(err, 'Could not update date.'), 'error');
    }
  };

  const handleConfirmDate = async (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(12, 0, 0, 0);
    try {
      await setTaskScheduled(task.id, normalized.toISOString());
      setShowCalendarModal(false);
    } catch (err) {
      showToast(toastForError(err, 'Could not update date.'), 'error');
    }
  };

  return (
    <>
      <Pressable
        onPress={handleItemPress}
        onLongPress={drag}
        delayLongPress={drag ? 450 : undefined}
        accessibilityHint={drag ? 'Long press to reorder' : undefined}
        style={({ pressed, hovered }) => [
          styles.todoItem,
          category && !isMobile ? styles.hasCategory : null,
          hovered ? styles.itemHovered : null,
          pressed ? styles.pressed : null,
        ]}>
        {categoryGradientColors && (
          <LinearGradient
            colors={[...categoryGradientColors]}
            start={{ x: 0.35, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.categoryGradient}
            pointerEvents="none"
          />
        )}

        {!isMobile && CategoryIconComp && category && (
          <View style={[styles.categoryBgIcon, { opacity: 0.2 }]} pointerEvents="none">
            <CategoryIconComp size={35} strokeWidth={1.5} color={category.color} />
          </View>
        )}

        <View style={[styles.todoMainRow, isExpanded && styles.todoMainRowExpanded]}>
          {showReorderButtons ? (
            <View style={styles.reorderButtons}>
              <Pressable
                onPress={onMoveUp}
                disabled={!canMoveUp}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Move task up"
                style={({ pressed, hovered }) => [
                  styles.reorderBtn,
                  !canMoveUp && styles.reorderBtnDisabled,
                  canMoveUp && (hovered || pressed) && styles.reorderBtnPressed,
                ]}>
                <ChevronUp
                  size={16}
                  color={canMoveUp ? colors.textSecondary : colors.textMuted}
                  strokeWidth={2.4}
                />
              </Pressable>
              <Pressable
                onPress={onMoveDown}
                disabled={!canMoveDown}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Move task down"
                style={({ pressed, hovered }) => [
                  styles.reorderBtn,
                  !canMoveDown && styles.reorderBtnDisabled,
                  canMoveDown && (hovered || pressed) && styles.reorderBtnPressed,
                ]}>
                <ChevronDown
                  size={16}
                  color={canMoveDown ? colors.textSecondary : colors.textMuted}
                  strokeWidth={2.4}
                />
              </Pressable>
            </View>
          ) : null}

          <Pressable
            style={({ pressed, hovered }) => [
              styles.todoCheckbox,
              task.done && styles.checked,
              hovered && !task.done && styles.checkboxHovered,
              hovered && task.done && styles.checkboxCheckedHovered,
              pressed && styles.controlPressed,
            ]}
            onPress={handleToggleDone}
            hitSlop={6}>
            {task.done ? <Text style={styles.checkmark}>✓</Text> : null}
          </Pressable>

          <View style={[styles.todoText, isExpanded && styles.todoTextExpanded]}>
            <Text
              style={[styles.titleText, task.done && styles.done]}
              numberOfLines={isExpanded ? undefined : isMobile ? 2 : 1}>
              {task.title}
            </Text>
            {hasDescription ? (
              isExpanded ? (
                <ChevronUp size={16} color={colors.textMuted} />
              ) : (
                <ChevronDown size={16} color={colors.textMuted} />
              )
            ) : null}
          </View>

          {/* Desktop: due date in the main row (hidden on completed — grouped by day). */}
          {!isMobile && (
            <View style={styles.todoIndicators}>
              {!task.done && dueDate ? (
                <Pressable
                  onPress={openCalendar}
                  style={({ pressed, hovered }) => [
                    styles.todoDate,
                    isToday && styles.todoDateToday,
                    isPast && styles.todoDatePast,
                    hovered && styles.todoDateHovered,
                    pressed && styles.controlPressed,
                  ]}>
                  <Text
                    style={[
                      styles.todoDateText,
                      isToday && styles.todoDateTextToday,
                      isPast && styles.todoDateTextPast,
                    ]}>
                    {formatShortDate(dueDate)}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {!isMobile && (
            <View style={styles.todoActions}>
              {!task.done && (
                <>
                  {isPomoActive ? (
                    <PomodoroTimer taskId={task.id} />
                  ) : canStart ? (
                    <Pressable
                      style={({ pressed, hovered }) => [
                        styles.todoActionBtn,
                        (hovered || pressed) && styles.actionPressed,
                      ]}
                      onPress={handleStartPomodoro}
                      hitSlop={6}
                      accessibilityLabel="Start pomodoro">
                      <AlarmClock size={18} color={colors.textSecondary} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={({ pressed, hovered }) => [
                      styles.todoActionBtn,
                      (hovered || pressed) && styles.actionPressed,
                    ]}
                    onPress={openCalendar}
                    hitSlop={6}>
                    <Calendar size={18} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    style={({ pressed, hovered }) => [
                      styles.todoActionBtn,
                      (hovered || pressed) && styles.actionPressed,
                    ]}
                    onPress={handleEdit}
                    hitSlop={6}>
                    <Pencil size={18} color={colors.textSecondary} />
                  </Pressable>
                </>
              )}
              <Pressable
                style={({ pressed, hovered }) => [
                  styles.todoActionBtn,
                  (hovered || pressed) && styles.actionPressed,
                ]}
                onPress={handleDelete}
                hitSlop={6}>
                <Trash2 size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}

          {isMobile && (
            <View style={styles.mobileRight}>
              {!task.done && dueDate ? (
                <Pressable
                  onPress={openCalendar}
                  style={[
                    styles.todoDate,
                    isToday && styles.todoDateToday,
                    isPast && styles.todoDatePast,
                  ]}>
                  <Text
                    style={[
                      styles.todoDateText,
                      isToday && styles.todoDateTextToday,
                      isPast && styles.todoDateTextPast,
                    ]}
                    numberOfLines={1}>
                    {formatShortDate(dueDate)}
                  </Text>
                </Pressable>
              ) : null}
              {CategoryIconComp && category && (
                <View style={{ opacity: 0.5 }}>
                  <CategoryIconComp size={20} strokeWidth={1.5} color={category.color} />
                </View>
              )}
              {!task.done ? (
                <Pressable
                  style={styles.mobilePlus}
                  onPress={() => setShowMobileActions(true)}
                  hitSlop={8}>
                  <CirclePlus size={20} color={colors.textPrimary} />
                </Pressable>
              ) : (
                <Pressable
                  style={styles.mobilePlus}
                  onPress={handleDelete}
                  hitSlop={8}>
                  <Trash2 size={20} color={colors.textPrimary} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Mobile: only timer gets a second row (compact) */}
        {isMobile && isPomoActive ? (
          <View style={styles.mobileMetaRow}>
            <PomodoroTimer taskId={task.id} />
          </View>
        ) : null}

        {tags.length > 0 && (
          <View style={styles.tagChipRow}>
            {tags.map((tag) => (
              <View key={tag.id} style={[styles.tagChip, { borderColor: tag.color }]}>
                <Text style={[styles.tagChipText, { color: tag.color }]}>#{tag.name}</Text>
              </View>
            ))}
          </View>
        )}

        {isExpanded && hasDescription && (
          <View style={styles.descriptionWrapper}>
            <Text style={[styles.todoDescription, task.done && styles.done]}>
              {task.description}
            </Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={showMobileActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMobileActions(false)}>
        <Pressable style={styles.mobileOverlay} onPress={() => setShowMobileActions(false)}>
          <Pressable style={styles.mobileActionsModal} onPress={(e) => e.stopPropagation()}>
            {canStart ? (
              <Pressable
                style={styles.mobileActionRow}
                onPress={() => {
                  setShowMobileActions(false);
                  handleStartPomodoro();
                }}>
                <AlarmClock size={18} color={colors.textPrimary} />
                <Text style={styles.mobileActionText}>Pomodoro</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.mobileActionRow}
              onPress={() => {
                setShowMobileActions(false);
                openCalendar();
              }}>
              <Calendar size={18} color={colors.textPrimary} />
              <Text style={styles.mobileActionText}>Calendar</Text>
            </Pressable>

            <Pressable
              style={styles.mobileActionRow}
              onPress={() => {
                setShowMobileActions(false);
                handleEdit();
              }}>
              <Pencil size={18} color={colors.textPrimary} />
              <Text style={styles.mobileActionText}>Edit</Text>
            </Pressable>

            <Pressable
              style={styles.mobileActionRow}
              onPress={() => {
                setShowMobileActions(false);
                handleDelete();
              }}>
              <Trash2 size={18} color={colors.textPrimary} />
              <Text style={styles.mobileActionText}>Delete</Text>
            </Pressable>

            <Pressable
              style={[styles.mobileActionRow, styles.mobileClose]}
              onPress={() => setShowMobileActions(false)}>
              <X size={18} color={colors.red} />
              <Text style={[styles.mobileActionText, { color: colors.red }]}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <EditTaskModal
        visible={showEditModal}
        task={task}
        categories={categories}
        tags={allTags}
        onClose={() => setShowEditModal(false)}
        onUpdate={updateTask}
      />

      <CalendarModal
        visible={showCalendarModal}
        selected={dueDate}
        onClose={() => setShowCalendarModal(false)}
        onClear={handleClearDate}
        onConfirm={handleConfirmDate}
      />
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    todoItem: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: colors.bgTodoItem,
      borderRadius: tokens.borderRadius,
      borderWidth: 1,
      borderColor: colors.borderColor,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
      ...webInteractive,
      ...Platform.select({
        web: { boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' } as object,
        default: {
          shadowColor: '#0f172a',
          shadowOpacity: 0.04,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        },
      }),
    },
    hasCategory: {
      paddingRight: 48,
    },
    itemHovered: {
      borderColor: colors.primary,
      backgroundColor: colors.todoHighlight,
    },
    pressed: {
      opacity: 0.96,
    },
    controlPressed: {
      opacity: 0.85,
    },
    categoryGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    categoryBgIcon: {
      position: 'absolute',
      right: 12,
      top: '50%',
      marginTop: -17,
      zIndex: 0,
    },
    todoMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      zIndex: 1,
    },
    todoMainRowExpanded: {
      alignItems: 'flex-start',
    },
    reorderButtons: {
      marginLeft: -4,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
    },
    reorderBtn: {
      width: 22,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 5,
      ...webInteractive,
    },
    reorderBtnPressed: {
      backgroundColor: colors.todoHighlight,
    },
    reorderBtnDisabled: {
      opacity: 0.35,
    },
    todoCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      marginTop: 1,
      ...webInteractive,
    },
    checkboxHovered: {
      backgroundColor: colors.primaryLight,
    },
    checkboxCheckedHovered: {
      backgroundColor: colors.primaryHover,
      borderColor: colors.primaryHover,
    },
    checked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 14,
    },
    todoText: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    todoTextExpanded: {
      alignItems: 'flex-start',
    },
    titleText: {
      flex: 1,
      flexShrink: 1,
      minWidth: 48,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      lineHeight: 21,
    },
    done: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    todoIndicators: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    mobileMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      marginLeft: 32,
      zIndex: 1,
    },
    todoDate: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      ...webInteractive,
      backgroundColor: colors.todoHighlight,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    todoDateHovered: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    todoDateToday: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    todoDatePast: {
      backgroundColor: colors.pink,
      borderColor: colors.red,
    },
    todoDateCompleted: {
      backgroundColor: colors.bgSurface,
      borderColor: colors.borderColor,
    },
    todoDateText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    todoDateTextToday: {
      color: colors.primary,
    },
    todoDateTextPast: {
      color: colors.red,
    },
    todoDateTextCompleted: {
      color: colors.textMuted,
    },
    todoActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    todoActionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    actionPressed: {
      backgroundColor: colors.todoHighlight,
    },
    mobileRight: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
      gap: 6,
    },
    mobilePlus: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tagChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
      marginLeft: 32,
      zIndex: 1,
    },
    tagChip: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: colors.bgSurface,
    },
    tagChipText: {
      fontSize: 11,
      fontWeight: '600',
    },
    descriptionWrapper: {
      marginTop: 8,
      marginLeft: 32,
      zIndex: 1,
    },
    todoDescription: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    mobileOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: 'flex-end',
    },
    mobileActionsModal: {
      backgroundColor: colors.bgSurface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderColor: colors.borderColor,
    },
    mobileActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 10,
    },
    mobileActionText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    mobileClose: {
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
  });
}
