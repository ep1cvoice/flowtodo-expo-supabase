import { strings } from '@/shared/lib/strings';
import { useCallback, useMemo } from 'react';
import { useTasksActions } from '@/features/tasks/TasksContext';
import { useToast } from '@/shared/providers/ToastContext';
import { useToastedAction } from '@/shared/lib/useToastedAction';

/**
 * Shared toggle/delete handlers with toast feedback, used by the active,
 * calendar and completed task views.
 */
export function useTaskActions() {
  const { toggleTask, deleteTask } = useTasksActions();
  const { showToast } = useToast();
  const runToasted = useToastedAction();

  const handleToggle = useCallback(
    async (id: number) => {
      await runToasted(() => toggleTask(id), strings.tasks.updateFailed);
    },
    [toggleTask, runToasted]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      const result = await runToasted(() => deleteTask(id), strings.tasks.deleteFailed);
      if (result.ok) showToast(strings.tasks.deleted);
    },
    [deleteTask, runToasted, showToast]
  );

  return useMemo(() => ({ handleToggle, handleDelete }), [handleToggle, handleDelete]);
}
