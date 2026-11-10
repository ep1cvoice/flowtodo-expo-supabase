import { useCallback } from 'react';
import { useTasks } from '@/features/tasks/TasksContext';
import { useToastedAction } from '@/shared/lib/useToastedAction';
import { toScheduledIso } from '@/features/tasks/lib/calendarDate';
import { strings } from '@/shared/lib/strings';
import type { Task } from '@/types';

// Clear / confirm handlers for a task's due date. `onSaved` runs only after a successful
// update (typically closes the calendar); failures show an error toast and keep it open.
export function useTaskScheduleActions(task: Pick<Task, 'id'>, onSaved: () => void) {
  const { setTaskScheduled } = useTasks();
  const runToasted = useToastedAction();

  const run = useCallback(
    async (scheduled: string | null) => {
      const result = await runToasted(
        () => setTaskScheduled(task.id, scheduled),
        strings.tasks.updateDateFailed,
      );
      if (result.ok) onSaved();
    },
    [task.id, setTaskScheduled, onSaved, runToasted],
  );

  const handleClearDate = useCallback(() => run(null), [run]);
  const handleConfirmDate = useCallback((date: Date) => run(toScheduledIso(date)), [run]);

  return { handleClearDate, handleConfirmDate };
}
