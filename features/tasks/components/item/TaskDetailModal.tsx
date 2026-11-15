import { strings } from '@/shared/lib/strings';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_TAGS_PER_TASK } from '@/types';
import { useTasksState } from '@/features/tasks/TasksContext';
import { View } from 'react-native';
import CalendarModal from '@/features/tasks/components/calendar/CalendarModal';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import SheetFrame from '@/shared/ui/SheetFrame';
import { useTheme } from '@/shared/providers/ThemeContext';
import { useTaskScheduleActions } from '@/features/tasks/lib/useTaskScheduleActions';
import type { Task } from '@/types';
import TaskDetailHeader from '@/features/tasks/components/item/taskDetail/TaskDetailHeader';
import TaskDetailMeta from '@/features/tasks/components/item/taskDetail/TaskDetailMeta';
import TaskDescriptionField from '@/features/tasks/components/item/taskDetail/TaskDescriptionField';
import TaskDetailFooter from '@/features/tasks/components/item/taskDetail/TaskDetailFooter';
import { createTaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import { pointerMarker } from '@/features/tasks/components/item/taskDetail/taskDetailUtils';
import TaskLabelMenu from '@/features/tasks/components/item/taskDetail/TaskLabelMenu';
import { useTaskPatch } from '@/features/tasks/components/item/taskDetail/useTaskPatch';
import { useDescriptionAutosave } from '@/features/tasks/components/item/taskDetail/useDescriptionAutosave';

interface TaskDetailModalProps {
  visible: boolean;
  task: Task;
  canStart: boolean;
  isPomoActive: boolean;
  onClose: () => void;
  onDelete: () => void | boolean | Promise<void | boolean>;
  onOpenCalendar: () => void;
  onStartPomodoro: () => void;
  onToggleComplete: () => void | Promise<void>;
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
  const styles = useMemo(() => createTaskDetailStyles(colors, isDark), [colors, isDark]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState<'tags' | 'category' | null>(null);
  const { categories, tags: allTags } = useTasksState();
  const patchTask = useTaskPatch(task);
  const taskTagIds = (task.tags ?? []).map((tag) => tag.id);
  const {
    inputRef,
    draft,
    setDraft,
    saveDescription,
    commitFromOutside,
    armSkipSave,
    handleFocus,
    handleBlur,
  } = useDescriptionAutosave(task);
  const dueDate = task.scheduled ? new Date(task.scheduled) : null;
  const showPomodoro = !task.done && (isPomoActive || canStart);
  const showCalendarIcon = !task.done && !dueDate;
  const showAlarmIcon = showPomodoro && !isPomoActive;

  // Reset while rendering when the sheet closes (no extra render with stale state).
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) {
      setConfirmDelete(false);
      setMenu(null);
      setFullscreen(false);
    }
  }

  const handleClose = () => {
    void saveDescription();
    onClose();
  };

  const openDetailCalendar = () => {
    setTimeout(() => setShowCalendar(true), 0);
  };

  const { handleClearDate, handleConfirmDate } = useTaskScheduleActions(task, () =>
    setShowCalendar(false)
  );

  return (
    <SheetFrame
      visible={visible}
      onClose={handleClose}
      keyboardAvoiding
      header="none"
      centered
      maxWidth={fullscreen ? 100000 : undefined}
      overlayStyle={fullscreen ? styles.overlayFull : undefined}
      cardStyle={
        fullscreen
          ? [styles.card, styles.cardFull, { paddingTop: insets.top, paddingBottom: insets.bottom }]
          : styles.card
      }
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
          <TaskLabelMenu
            visible={menu === 'tags'}
            title={strings.tasks.tagsMenuTitle}
            items={allTags.map((tag) => ({ id: tag.id, name: `#${tag.name}`, color: tag.color }))}
            selectedIds={taskTagIds}
            emptyText={strings.tasks.noTagsYet}
            hint={
              taskTagIds.length >= MAX_TAGS_PER_TASK
                ? strings.tasks.tagLimit(MAX_TAGS_PER_TASK)
                : undefined
            }
            styles={styles}
            onClose={() => setMenu(null)}
            onToggle={(id) => {
              if (id === null) return;
              void patchTask((current) => {
                const ids = (current.tags ?? []).map((tag) => tag.id);
                if (ids.includes(id)) return { tagIds: ids.filter((x) => x !== id) };
                return ids.length >= MAX_TAGS_PER_TASK ? {} : { tagIds: [...ids, id] };
              });
            }}
          />
          <TaskLabelMenu
            visible={menu === 'category'}
            title={strings.tasks.categoryMenuTitle}
            items={[
              { id: null, name: strings.form.noCategory, color: colors.textMuted },
              ...categories.map((cat) => ({ id: cat.id, name: cat.name, color: cat.color })),
            ]}
            selectedIds={[task.categoryId]}
            emptyText=""
            styles={styles}
            onClose={() => setMenu(null)}
            onToggle={(id) => {
              void patchTask(() => ({ categoryId: id }));
              setMenu(null);
            }}
          />
          <ConfirmModal
            embedded
            visible={confirmDelete}
            title={strings.tasks.deleteConfirmTitle}
            message={strings.tasks.deleteConfirmMessage(task.title)}
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
      }
    >
      <View
        style={[styles.sheetBody, fullscreen && styles.sheetBodyFull]}
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
        }}
      >
        <TaskDetailHeader
          task={task}
          styles={styles}
          onClose={handleClose}
          onPressOutside={commitFromOutside}
          onSaveTitle={(title) => patchTask(() => ({ title }))}
          onArmSkipSave={armSkipSave}
          onToggleComplete={() => {
            void onToggleComplete();
          }}
        />
        <View style={[styles.content, fullscreen && styles.contentFull]}>
          <TaskDetailMeta
            task={task}
            dueDate={dueDate}
            showCalendarIcon={showCalendarIcon}
            styles={styles}
            onCommitFromOutside={commitFromOutside}
            onOpenCalendar={openDetailCalendar}
            onOpenCategory={() => {
              commitFromOutside();
              setMenu('category');
            }}
            onOpenTags={() => {
              commitFromOutside();
              setMenu('tags');
            }}
          />
          <TaskDescriptionField
            inputRef={inputRef}
            value={draft}
            done={task.done}
            fullscreen={fullscreen}
            styles={styles}
            onChange={setDraft}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <TaskDetailFooter
            showAlarmIcon={showAlarmIcon}
            fullscreen={fullscreen}
            styles={styles}
            onToggleFullscreen={() => setFullscreen((prev) => !prev)}
            onPressOutside={commitFromOutside}
            onArmSkipSave={armSkipSave}
            onCommitFromOutside={commitFromOutside}
            onStartPomodoro={onStartPomodoro}
            onDelete={() => {
              setShowCalendar(false);
              setConfirmDelete(true);
            }}
          />
        </View>
      </View>
    </SheetFrame>
  );
}
