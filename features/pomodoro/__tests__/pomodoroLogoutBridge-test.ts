import {
  pausePomodoroBeforeLogout,
  registerPomodoroLogoutSnapshot,
} from '@/features/pomodoro/lib/pomodoroLogoutBridge';

jest.mock('@/features/pomodoro/lib/mutations', () => ({ pausePomodoroRow: jest.fn() }));
jest.mock('@/shared/lib/logger', () => ({ logger: { warn: jest.fn() } }));

import { pausePomodoroRow } from '@/features/pomodoro/lib/mutations';

const pause = pausePomodoroRow as jest.Mock;
const pomo = (over: Record<string, unknown> = {}): any => ({
  id: 3,
  taskId: 1,
  startedAt: new Date(Date.now() - 5000).toISOString(),
  endedAt: null,
  duration: 1500,
  elapsed: 0,
  pausedAt: null,
  pausedOnLogout: false,
  ...over,
});

beforeEach(() => pause.mockReset());

it('freezes a running session and marks the pause as caused by logout', async () => {
  registerPomodoroLogoutSnapshot(() => ({ userId: 'u1', pomo: pomo() }));
  await pausePomodoroBeforeLogout();
  expect(pause).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 'u1', id: 3, onlyActive: true, onLogout: true })
  );
});

it('leaves a session that is already paused by hand untouched', async () => {
  registerPomodoroLogoutSnapshot(() => ({ userId: 'u1', pomo: pomo({ pausedAt: '2026-01-01T00:00:00Z' }) }));
  await pausePomodoroBeforeLogout();
  expect(pause).not.toHaveBeenCalled();
});
