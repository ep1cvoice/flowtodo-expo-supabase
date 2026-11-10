import * as Haptics from 'expo-haptics';
import CalendarModal from '@/features/tasks/components/calendar/CalendarModal';
import EditTaskModal from '@/features/tasks/components/form/EditTaskModal';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import MobileActionsSheet from '@/features/tasks/components/item/MobileActionsSheet';
import TaskDetailModal from '@/features/tasks/components/item/TaskDetailModal';
import { useTodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import { useTasks } from '@/features/tasks/TasksContext';
import { useTaskItemActions } from '@/features/tasks/lib/useTaskItemActions';
import { useTaskScheduleActions } from '@/features/tasks/lib/useTaskScheduleActions';
import { useMountOnFirstOpen } from '@/shared/lib/useMountOnFirstOpen';
import { isWeb } from '@/shared/lib/platform';
import { strings } from '@/shared/lib/strings';
import type { Task } from '@/types';

export type TaskModalKind = 'detail' | 'actions' | 'confirmDelete' | 'edit' | 'calendar';
export type TaskModalVisibility = Record<TaskModalKind, boolean>;

interface TaskItemModalsProps {
  task: Task;
  visible: TaskModalVisibility;
  onShow: (kind: TaskModalKind) => void;
  onHide: (kind: TaskModalKind) => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void | Promise<void>;
}

// The single set of modals shared by every row of a list; they act on the active task.
// Each modal is mounted on first open and then kept, so closing animations still play.
export default function TaskItemModals({
  task,
  visible,
  onShow,
  onHide,
  onToggle,
  onDelete,
}: TaskItemModalsProps) {
  const { colors, styles } = useTodoItemStyles();
  const { updateTask } = useTasks();
  const { isPomoActive, canStart, stopPomodoroIfActive, handleStartPomodoro, handleToggleDone } =
    useTaskItemActions(task, onToggle);
  const { handleClearDate, handleConfirmDate } = useTaskScheduleActions(task, () =>
    onHide('calendar'),
  );

  const mountDetail = useMountOnFirstOpen(visible.detail);
  const mountActions = useMountOnFirstOpen(visible.actions);
  const mountConfirmDelete = useMountOnFirstOpen(visible.confirmDelete);
  const mountEdit = useMountOnFirstOpen(visible.edit);
  const mountCalendar = useMountOnFirstOpen(visible.calendar);

  const dueDate = task.scheduled ? new Date(task.scheduled) : null;

  const handleDelete = async () => {
    if (!(await stopPomodoroIfActive())) return false;
    if (!isWeb) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await onDelete(task.id);
    return true;
  };

  const handleEdit = () => onShow('edit');
  const openCalendar = () => onShow('calendar');

  return (
    <>
      {mountDetail ? (
        <TaskDetailModal
          visible={visible.detail}
          task={task}
          canStart={canStart}
          isPomoActive={isPomoActive}
          onClose={() => onHide('detail')}
          onDelete={async () => {
            const deleted = await handleDelete();
            if (deleted) onHide('detail');
            return deleted;
          }}
          onEdit={handleEdit}
          onOpenCalendar={openCalendar}
          onStartPomodoro={handleStartPomodoro}
          onToggleComplete={async () => {
            const ok = await handleToggleDone();
            if (ok && !task.done) onHide('detail');
          }}
        />
      ) : null}

      {mountActions ? (
        <MobileActionsSheet
          visible={visible.actions}
          canStart={canStart}
          taskTitle={task.title}
          colors={colors}
          styles={styles}
          onClose={() => onHide('actions')}
          onStartPomodoro={handleStartPomodoro}
          onOpenCalendar={openCalendar}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : null}

      {mountConfirmDelete ? (
        <ConfirmModal
          visible={visible.confirmDelete}
          title={strings.tasks.deleteConfirmTitle}
          message={strings.tasks.deleteConfirmMessage(task.title)}
          onClose={() => onHide('confirmDelete')}
          onConfirm={async () => {
            const deleted = await handleDelete();
            if (deleted) onHide('confirmDelete');
          }}
        />
      ) : null}

      {mountEdit ? (
        <EditTaskModal
          visible={visible.edit}
          task={task}
          onClose={() => onHide('edit')}
          onUpdate={updateTask}
        />
      ) : null}

      {mountCalendar ? (
        <CalendarModal
          visible={visible.calendar}
          selected={dueDate}
          onClose={() => onHide('calendar')}
          onClear={handleClearDate}
          onConfirm={handleConfirmDate}
        />
      ) : null}
    </>
  );
}
