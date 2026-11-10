import { useTaskListActions } from '@/features/tasks/lib/useTaskListActions';
import type { Task } from '@/types';

// Pomodoro-aware actions of a single task (the modals shared by a list's rows).
export function useTaskItemActions(task: Task, onToggle: (id: number) => void) {
  const { activeTaskId, canStart, stopPomodoroIfActive, startPomodoro, toggleDone } =
    useTaskListActions(onToggle);

  return {
    isPomoActive: activeTaskId === task.id,
    canStart,
    stopPomodoroIfActive: () => stopPomodoroIfActive(task),
    handleStartPomodoro: () => startPomodoro(task),
    handleToggleDone: () => toggleDone(task),
  };
}
