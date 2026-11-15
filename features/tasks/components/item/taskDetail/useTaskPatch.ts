import { useCallback, useEffect, useRef } from 'react';
import { useTasksActions } from '@/features/tasks/TasksContext';
import { useToastedAction } from '@/shared/lib/useToastedAction';
import { logger } from '@/shared/lib/logger';
import { strings } from '@/shared/lib/strings';
import type { TaskFormInput } from '@/features/tasks/lib/types';
import type { Task } from '@/types';

// Saves a partial change (title, category, tags) of the task shown in the detail sheet.
// Saves run one after another and read the newest task, so quick successive taps on tags
// never overwrite each other with stale data.
export function useTaskPatch(task: Task) {
  const { updateTask } = useTasksActions();
  const runToasted = useToastedAction();
  const taskRef = useRef(task);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    taskRef.current = task;
  });

  return useCallback(
    (buildPatch: (current: Task) => Partial<TaskFormInput>): Promise<boolean> => {
      const run = async () => {
        const current = taskRef.current;
        const result = await runToasted(
          () =>
            updateTask(current.id, {
              title: current.title,
              description: current.description ?? '',
              categoryId: current.categoryId,
              tagIds: (current.tags ?? []).map((tag) => tag.id),
              ...buildPatch(current),
            }),
          strings.tasks.updateFailed,
        );
        if (!result.ok) logger.warn('Failed to update task:', result.error);
        return result.ok;
      };
      const next = queueRef.current.then(run, run);
      queueRef.current = next;
      return next;
    },
    [runToasted, updateTask],
  );
}
