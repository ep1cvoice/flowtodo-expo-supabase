import { strings } from '@/shared/lib/strings';
import { useEffect, useMemo, useState } from 'react';
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
import { useDescriptionAutosave } from '@/features/tasks/components/item/taskDetail/useDescriptionAutosave';

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
  const styles = useMemo(() => createTaskDetailStyles(colors, isDark), [colors, isDark]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  useEffect(() => {
    if (!visible) setConfirmDelete(false);
  }, [visible]);

  const handleClose = () => {
    void saveDescription();
    onClose();
  };

  const openDetailCalendar = () => {
    setTimeout(() => setShowCalendar(true), 0);
  };

  const { handleClearDate, handleConfirmDate } = useTaskScheduleActions(task, () =>
    setShowCalendar(false),
  );

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
            onFocus={handleFocus}
            onBlur={handleBlur}
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
