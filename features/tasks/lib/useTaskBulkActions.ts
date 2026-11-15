import { useCallback } from 'react';
import { useTasksActions } from '@/features/tasks/TasksContext';
import { useTaskListActions } from '@/features/tasks/lib/useTaskListActions';
import { useToast } from '@/shared/providers/ToastContext';
import { useToastedAction } from '@/shared/lib/useToastedAction';
import { strings } from '@/shared/lib/strings';
import type { Task } from '@/types';

const noop = () => {};

// Actions applied to every task selected in action mode. Each finishes by calling `done`
// (to leave selection mode) only when it fully succeeded.
export function useTaskBulkActions(tasks: Task[], done: () => void) {
  const { addTask, updateTask, deleteTask } = useTasksActions();
  const { showToast } = useToast();
  const runToasted = useToastedAction();
  const { stopPomodoroIfActive } = useTaskListActions(noop);

  const duplicate = useCallback(async () => {
    // Newest insert lands on top, so add in reverse to keep the selected order.
    const result = await runToasted(async () => {
      for (const task of [...tasks].reverse()) {
        await addTask({
          title: task.title,
          description: task.description,
          categoryId: task.categoryId,
          tagIds: (task.tags ?? []).map((tag) => tag.id),
          scheduled: task.scheduled,
        });
      }
    }, strings.tasks.duplicateFailed);
    if (result.ok) {
      showToast(strings.tasks.duplicated(tasks.length));
      done();
    }
  }, [tasks, addTask, runToasted, showToast, done]);

  const setCategory = useCallback(
    async (categoryId: number | null) => {
      const result = await runToasted(async () => {
        for (const task of tasks) {
          if (task.categoryId === categoryId) continue;
          await updateTask(task.id, {
            title: task.title,
            description: task.description,
            categoryId,
            tagIds: (task.tags ?? []).map((tag) => tag.id),
          });
        }
      }, strings.tasks.categoryChangeFailed);
      if (result.ok) done();
    },
    [tasks, updateTask, runToasted, done]
  );

  const remove = useCallback(async () => {
    for (const task of tasks) {
      if (!(await stopPomodoroIfActive(task))) return;
    }
    const result = await runToasted(async () => {
      for (const task of tasks) await deleteTask(task.id);
    }, strings.tasks.deleteFailed);
    if (result.ok) {
      showToast(strings.tasks.deletedMany(tasks.length));
      done();
    }
  }, [tasks, deleteTask, stopPomodoroIfActive, runToasted, showToast, done]);

  return { duplicate, setCategory, remove };
}
