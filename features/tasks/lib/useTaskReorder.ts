import { strings } from '@/shared/lib/strings';
import { useCallback } from 'react';
import { useTasks } from '@/features/tasks/TasksContext';
import { useToast } from '@/shared/providers/ToastContext';
import { toastForError } from '@/shared/lib/networkError';
import { applyFilteredReorder } from '@/features/tasks/lib/taskReorder';
import type { Task } from '@/types';
import { logger } from '@/shared/lib/logger';

type Params = {
  activeTasks: Task[];
  filteredTasks: Task[];
  canReorder: boolean;
  hasListConstraints: boolean;
};

export function useTaskReorder({
  activeTasks,
  filteredTasks,
  canReorder,
  hasListConstraints,
}: Params) {
  const { reorderTasks } = useTasks();
  const { showToast } = useToast();

  const persistOrder = useCallback(
    (orderedActive: Task[]) => {
      void reorderTasks(
        orderedActive.map((task, index) => ({ id: task.id, sortOrder: index }))
      ).catch((err) => {
        logger.warn('Failed to reorder tasks:', err?.message ?? err);
        showToast(toastForError(err, strings.tasks.saveOrderFailed), 'error');
      });
    },
    [reorderTasks, showToast]
  );

  const persistVisibleOrder = useCallback(
    (reorderedFiltered: Task[]) => {
      persistOrder(
        hasListConstraints
          ? applyFilteredReorder(activeTasks, reorderedFiltered)
          : reorderedFiltered
      );
    },
    [activeTasks, hasListConstraints, persistOrder]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Task[] }) => {
      if (!canReorder) return;
      if (data === filteredTasks) return;
      persistVisibleOrder(data);
    },
    [canReorder, filteredTasks, persistVisibleOrder]
  );

  const moveTask = useCallback(
    (taskId: number, direction: -1 | 1) => {
      if (!canReorder) return;
      const list = [...filteredTasks];
      const index = list.findIndex((task) => task.id === taskId);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= list.length) return;
      const next = [...list];
      const tmp = next[index];
      next[index] = next[swapIndex];
      next[swapIndex] = tmp;
      persistVisibleOrder(next);
    },
    [canReorder, filteredTasks, persistVisibleOrder]
  );

  return { handleDragEnd, moveTask };
}
