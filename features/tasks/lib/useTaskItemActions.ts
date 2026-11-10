import * as Haptics from 'expo-haptics';
import { usePomodoro } from '@/features/pomodoro/PomodoroContext';
import { useToastedAction } from '@/shared/lib/useToastedAction';
import { isWeb } from '@/shared/lib/platform';
import { strings } from '@/shared/lib/strings';
import type { Task } from '@/types';

// Pomodoro-aware actions of a single task row / its modals. Stopping an active pomodoro is a
// precondition for completing or deleting the task; a failed stop aborts the action.
export function useTaskItemActions(task: Task, onToggle: (id: number) => void) {
  const { activeTaskId, canStart, startPomo, endPomo } = usePomodoro();
  const runToasted = useToastedAction();
  const isPomoActive = activeTaskId === task.id;

  const stopPomodoroIfActive = async () => {
    if (!isPomoActive) return true;
    const result = await runToasted(() => endPomo(), strings.tasks.stopPomodoroFailed);
    return result.ok;
  };

  const handleStartPomodoro = () => {
    if (!canStart || task.done) return;
    void runToasted(() => startPomo(task.id), strings.tasks.startPomodoroFailed);
  };

  const handleToggleDone = async () => {
    if (!(await stopPomodoroIfActive())) return false;
    if (!isWeb) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onToggle(task.id);
    return true;
  };

  return { isPomoActive, canStart, stopPomodoroIfActive, handleStartPomodoro, handleToggleDone };
}
