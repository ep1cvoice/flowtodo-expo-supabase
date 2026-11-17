import { renderHook } from '@testing-library/react-native';
import {
  planEndNotification,
  usePomodoroEndNotification,
} from '@/features/pomodoro/lib/usePomodoroEndNotification';
import {
  cancelPomodoroEndNotification,
  dismissPomodoroEndNotification,
  schedulePomodoroEndNotification,
} from '@/features/pomodoro/lib/notifications';

jest.mock('@/features/pomodoro/lib/notifications', () => ({
  schedulePomodoroEndNotification: jest.fn().mockResolvedValue(undefined),
  cancelPomodoroEndNotification: jest.fn().mockResolvedValue(undefined),
  dismissPomodoroEndNotification: jest.fn().mockResolvedValue(undefined),
}));

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

const pomo = (over: Record<string, unknown> = {}): any => ({
  id: 1,
  taskId: 7,
  startedAt: new Date(NOW - 60_000).toISOString(),
  endedAt: null,
  duration: 1500,
  elapsed: 0,
  pausedAt: null,
  pausedOnLogout: false,
  ...over,
});

describe('planEndNotification', () => {
  it('schedules the end of a running countdown', () => {
    expect(planEndNotification(pomo(), 'countdown', NOW)).toEqual({
      kind: 'schedule',
      at: NOW - 60_000 + 1_500_000,
    });
  });

  it('counts time already stored from earlier segments', () => {
    const plan = planEndNotification(pomo({ elapsed: 600_000 }), 'countdown', NOW);
    expect(plan).toEqual({ kind: 'schedule', at: NOW + 1_500_000 - 600_000 - 60_000 });
  });

  it('rounds down to whole seconds so re-renders do not reschedule', () => {
    const a = planEndNotification(pomo(), 'countdown', NOW + 3);
    const b = planEndNotification(pomo(), 'countdown', NOW + 400);
    expect(a).toEqual(b);
  });

  it('cancels when paused early or counting up', () => {
    expect(planEndNotification(pomo({ pausedAt: 'x', elapsed: 1000 }), 'countdown', NOW)).toEqual({
      kind: 'cancel',
    });
    expect(planEndNotification(pomo(), 'countup', NOW)).toEqual({ kind: 'cancel' });
  });

  it('leaves the notification alone once time is up, even after the alarm pauses', () => {
    const over = pomo({ elapsed: 1_500_000, pausedAt: new Date(NOW).toISOString() });
    expect(planEndNotification(over, 'countdown', NOW)).toEqual({ kind: 'finished' });
    const running = pomo({ startedAt: new Date(NOW - 2_000_000).toISOString() });
    expect(planEndNotification(running, 'countdown', NOW)).toEqual({ kind: 'finished' });
  });

  it('clears without a session', () => {
    expect(planEndNotification(null, 'countdown', NOW)).toEqual({ kind: 'clear' });
    expect(planEndNotification(pomo({ endedAt: 'x' }), 'countdown', NOW)).toEqual({
      kind: 'clear',
    });
  });
});

describe('usePomodoroEndNotification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('schedules once for a running session and cancels on pause', async () => {
    const running = pomo({ startedAt: new Date().toISOString() });
    const hook = await renderHook(
      ({ p }: { p: any }) => usePomodoroEndNotification(p, 'countdown'),
      { initialProps: { p: running } }
    );
    expect(schedulePomodoroEndNotification).toHaveBeenCalledTimes(1);

    await hook.rerender({ p: { ...running } });
    expect(schedulePomodoroEndNotification).toHaveBeenCalledTimes(1);

    await hook.rerender({ p: { ...running, pausedAt: new Date().toISOString(), elapsed: 5000 } });
    expect(cancelPomodoroEndNotification).toHaveBeenCalledTimes(1);
    expect(dismissPomodoroEndNotification).not.toHaveBeenCalled();
  });

  it('cancels and dismisses when the session ends', async () => {
    await renderHook(() => usePomodoroEndNotification(null, 'countdown'));
    expect(cancelPomodoroEndNotification).toHaveBeenCalled();
    expect(dismissPomodoroEndNotification).toHaveBeenCalled();
  });

  it('does nothing while disabled', async () => {
    await renderHook(() => usePomodoroEndNotification(null, 'countdown', false));
    expect(cancelPomodoroEndNotification).not.toHaveBeenCalled();
    expect(dismissPomodoroEndNotification).not.toHaveBeenCalled();
    expect(schedulePomodoroEndNotification).not.toHaveBeenCalled();
  });
});
