import { strings } from '@/shared/lib/strings';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import CalendarModal from '@/features/tasks/components/calendar/CalendarModal';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import SheetFrame from '@/shared/ui/SheetFrame';
import { useTasks } from '@/features/tasks/TasksContext';
import { useTheme } from '@/shared/providers/ThemeContext';
import { useToast } from '@/shared/providers/ToastContext';
import { toScheduledIso } from '@/features/tasks/lib/calendarDate';
import { toastForError } from '@/shared/lib/networkError';
import type { Task } from '@/types';
import TaskDetailHeader from '@/features/tasks/components/item/taskDetail/TaskDetailHeader';
import TaskDetailMeta from '@/features/tasks/components/item/taskDetail/TaskDetailMeta';
import TaskDescriptionField from '@/features/tasks/components/item/taskDetail/TaskDescriptionField';
import TaskDetailFooter from '@/features/tasks/components/item/taskDetail/TaskDetailFooter';
import { createTaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import { pointerMarker } from '@/features/tasks/components/item/taskDetail/taskDetailUtils';
import { logger } from '@/shared/lib/logger';

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
  const styles = useMemo(() => createTaskDetailStyles(colors, isDark), [colors, isDark]);
  const tags = task.tags ?? [];
  const [draft, setDraft] = useState(task.description ?? '');
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      logger.warn(strings.tasks.descriptionSaveLog, err);
      showToast(toastForError(err, strings.tasks.saveDescriptionFailed), 'error');
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
      showToast(toastForError(err, strings.tasks.updateDateFailed), 'error');
    }
  };

  const handleConfirmDate = async (date: Date) => {
    try {
      await setTaskScheduled(task.id, toScheduledIso(date));
      setShowCalendar(false);
    } catch (err) {
      showToast(toastForError(err, strings.tasks.updateDateFailed), 'error');
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
        <TaskDetailHeader
          task={task}
          styles={styles}
          onClose={handleClose}
          onPressOutside={commitFromOutside}
        />
        <View style={styles.content}>
          <TaskDetailMeta
            task={task}
            dueDate={dueDate}
            showCalendarIcon={showCalendarIcon}
            showAlarmIcon={showAlarmIcon}
            isPomoActive={isPomoActive}
            styles={styles}
            onCommitFromOutside={commitFromOutside}
            onOpenCalendar={openDetailCalendar}
            onStartPomodoro={onStartPomodoro}
          />
          <TaskDescriptionField
            inputRef={inputRef}
            value={draft}
            done={task.done}
            styles={styles}
            onChange={setDraft}
            onFocus={() => {
              focusedRef.current = true;
            }}
            onBlur={() => {
              focusedRef.current = false;
              if (skipSaveRef.current) return;
              void saveDescription();
            }}
          />
          <TaskDetailFooter
            done={task.done}
            styles={styles}
            onPressOutside={commitFromOutside}
            onArmSkipSave={armSkipSave}
            onDelete={() => {
              setShowCalendar(false);
              setConfirmDelete(true);
            }}
            onToggleComplete={() => {
              void onToggleComplete();
            }}
          />
        </View>
      </View>
    </SheetFrame>
  );
}
