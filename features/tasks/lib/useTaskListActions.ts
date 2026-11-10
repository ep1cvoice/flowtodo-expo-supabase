import { useCallback, useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePomodoroActions, usePomodoroState } from '@/features/pomodoro/PomodoroContext';
import { tokens } from '@/shared/constants/theme';
import { useToastedAction } from '@/shared/lib/useToastedAction';
import { isWeb } from '@/shared/lib/platform';
import { strings } from '@/shared/lib/strings';
import type { Task } from '@/types';

// Pomodoro-aware handlers that work on any task. Their identities only change with
// `onToggle` / the toast function, so they can be shared by every row of a list.
// Stopping an active pomodoro is a precondition for completing or deleting the task; a
// failed stop aborts the action.
export function useTaskListActions(onToggle: (id: number) => void) {
  const { activeTaskId, canStart } = usePomodoroState();
  const { startPomo, endPomo } = usePomodoroActions();
  const runToasted = useToastedAction();

  // Read at call time so the handlers don't change identity with the pomodoro state.
  const latest = useRef({ activeTaskId, canStart });
  latest.current = { activeTaskId, canStart };

  const stopPomodoroIfActive = useCallback(
    async (task: Task) => {
      if (latest.current.activeTaskId !== task.id) return true;
      const result = await runToasted(() => endPomo(task.title), strings.tasks.stopPomodoroFailed);
      return result.ok;
    },
    [endPomo, runToasted]
  );

  const startPomodoro = useCallback(
    (task: Task) => {
      if (!latest.current.canStart || task.done) return;
      void runToasted(() => startPomo(task), strings.tasks.startPomodoroFailed);
    },
    [startPomo, runToasted]
  );

  const toggleDone = useCallback(
    async (task: Task) => {
      if (!(await stopPomodoroIfActive(task))) return false;
      if (!isWeb) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onToggle(task.id);
      return true;
    },
    [stopPomodoroIfActive, onToggle]
  );

  return { activeTaskId, canStart, stopPomodoroIfActive, startPomodoro, toggleDone };
}

/**
 * List-level inputs for task rows (ToDoItem). Rows are memoized, so everything that depends
 * on global state is read here once and passed down; `rowProps` is referentially stable
 * until the layout breakpoint or `canStart` changes, and a row's `isPomoActive` is
 * `activeTaskId === task.id`.
 */
export function useTaskRowProps(onToggle: (id: number) => void) {
  const { width } = useWindowDimensions();
  const isMobile = width < tokens.desktopBreakpoint;
  const { activeTaskId, canStart, startPomodoro, toggleDone } = useTaskListActions(onToggle);

  const rowProps = useMemo(
    () => ({ isMobile, canStart, onStartPomodoro: startPomodoro, onToggleDone: toggleDone }),
    [isMobile, canStart, startPomodoro, toggleDone]
  );

  return { rowProps, activeTaskId };
}
