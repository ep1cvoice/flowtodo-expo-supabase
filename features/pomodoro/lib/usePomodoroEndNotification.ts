import { useEffect } from 'react';
import type { PomoData } from '@/types';
import type { PomodoroMode } from '@/features/pomodoro/lib/displayTime';
import { computeElapsedMs } from '@/features/pomodoro/lib/elapsed';
import {
  cancelPomodoroEndNotification,
  dismissPomodoroEndNotification,
  schedulePomodoroEndNotification,
} from '@/features/pomodoro/lib/notifications';

export type EndNotificationPlan =
  /** Countdown running: ring at `at` (ms epoch, whole seconds). */
  | { kind: 'schedule'; at: number }
  /** Time is up (the alarm pauses the session): leave a pending or shown notification alone. */
  | { kind: 'finished' }
  /** Paused early or counting up: nothing should ring. */
  | { kind: 'cancel' }
  /** No session (ended or logged out): also remove a notification that is still shown. */
  | { kind: 'clear' };

export function planEndNotification(
  pomo: PomoData | null,
  mode: PomodoroMode,
  now = Date.now()
): EndNotificationPlan {
  if (!pomo || pomo.endedAt) return { kind: 'clear' };
  const durationMs = (Number(pomo.duration) || 0) * 1000;
  if (mode !== 'countdown' || durationMs <= 0) return { kind: 'cancel' };
  const remaining = durationMs - computeElapsedMs(pomo, now);
  if (remaining <= 0) return { kind: 'finished' };
  if (pomo.pausedAt) return { kind: 'cancel' };
  // Rounded down, so it never rings after the in-app check (which floors elapsed seconds), and
  // re-renders a few ms apart produce the same plan.
  return { kind: 'schedule', at: Math.floor((now + remaining) / 1000) * 1000 };
}

/**
 * Keeps one system notification scheduled for the end of the running countdown session, so
 * the user hears about it even while the app is in the background or closed.
 */
export function usePomodoroEndNotification(
  pomo: PomoData | null,
  mode: PomodoroMode,
  /** False while the session is loading, so a cold start does not cancel a valid notification. */
  enabled = true
): void {
  const plan = enabled ? planEndNotification(pomo, mode) : null;
  const kind = plan?.kind ?? null;
  const at = plan?.kind === 'schedule' ? plan.at : null;

  useEffect(() => {
    if (kind === 'schedule' && at !== null) {
      void schedulePomodoroEndNotification(at);
    } else if (kind === 'cancel') {
      void cancelPomodoroEndNotification();
    } else if (kind === 'clear') {
      void cancelPomodoroEndNotification();
      void dismissPomodoroEndNotification();
    }
  }, [kind, at]);
}
