import { strings } from '@/shared/lib/strings';
import { useCallback, useMemo } from 'react';
import { useTasks } from '@/features/tasks/TasksContext';
import { useToast } from '@/shared/providers/ToastContext';
import { toastForError } from '@/shared/lib/networkError';

/**
 * Shared toggle/delete handlers with toast feedback, used by the active,
 * calendar and completed task views.
 */
export function useTaskActions() {
  const { toggleTask, deleteTask } = useTasks();
  const { showToast } = useToast();

  const handleToggle = useCallback(
    async (id: number) => {
      try {
        await toggleTask(id);
      } catch (err) {
        showToast(toastForError(err, strings.tasks.updateFailed), 'error');
      }
    },
    [toggleTask, showToast]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteTask(id);
        showToast(strings.tasks.deleted);
      } catch (err) {
        showToast(toastForError(err, strings.tasks.deleteFailed), 'error');
      }
    },
    [deleteTask, showToast]
  );

  return useMemo(() => ({ handleToggle, handleDelete }), [handleToggle, handleDelete]);
}
