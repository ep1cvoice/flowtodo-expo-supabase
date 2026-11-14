// Characterization tests for PomodoroContext: start / pause / resume / end and resumeIfPaused.
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  PomodoroProvider,
  usePomodoroActions,
  usePomodoroState,
} from '@/features/pomodoro/PomodoroContext';
import { pomodoroStore } from '@/features/pomodoro/lib/store';

const usePomodoro = () => ({ ...usePomodoroState(), ...usePomodoroActions() });

const mockAuth: { user: any; dek: Uint8Array | null } = { user: null, dek: null };

jest.mock('@/features/tasks/lib/store', () => ({
  taskStore: { subscribe: jest.fn(() => () => {}) },
}));
jest.mock('@/core/auth/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/core/auth/EncryptionContext', () => ({ useEncryption: () => mockAuth }));
jest.mock('@/shared/lib/withTimeout', () => ({ withTimeout: (p: Promise<unknown>) => p }));
jest.mock('@/shared/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/features/pomodoro/lib/pomodoroLogoutBridge', () => ({
  registerPomodoroLogoutSnapshot: jest.fn(() => () => {}),
}));
jest.mock('@/features/pomodoro/lib/queries', () => ({ MAX_HISTORY: 5 }));
jest.mock('@/features/pomodoro/lib/store', () => ({
  pomodoroStore: {
    fetchPomodoros: jest.fn(),
    deletePomodoroRecord: jest.fn(),
    endPomodoroRow: jest.fn(),
    insertPomodoro: jest.fn(),
    pausePomodoroRow: jest.fn(),
    resumePomodoroAndFetch: jest.fn(),
    resumePomodoroRow: jest.fn(),
  },
}));

const store = pomodoroStore as unknown as Record<string, jest.Mock>;
const fetchPomodoros = store.fetchPomodoros;
const insertPomodoro = store.insertPomodoro;
const pausePomodoroRow = store.pausePomodoroRow;
const resumePomodoroRow = store.resumePomodoroRow;
const endPomodoroRow = store.endPomodoroRow;
const resumePomodoroAndFetch = store.resumePomodoroAndFetch;

const pomo = (over: Record<string, unknown> = {}): any => ({
  id: 1,
  taskId: 7,
  startedAt: new Date(Date.now() - 60_000).toISOString(),
  endedAt: null,
  duration: 1500,
  elapsed: 0,
  pausedAt: null,
  pausedOnLogout: false,
  ...over,
});

const TASK = { id: 7, title: 'Write tests' };

const wrapper = ({ children }: { children: ReactNode }) => (
  <PomodoroProvider>{children}</PomodoroProvider>
);

async function renderPomodoro() {
  const hook = await renderHook(() => usePomodoro(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  jest.resetAllMocks();
  mockAuth.user = { id: 'u1', settings: { pomodoroTime: 30 } };
  mockAuth.dek = new Uint8Array(32).fill(1);
  fetchPomodoros.mockResolvedValue({ active: null, history: [] });
});

it('starts a session with the configured duration and task name', async () => {
  insertPomodoro.mockImplementation(async (o: any) => pomo({ duration: o.durationSec }));
  const { result } = await renderPomodoro();
  expect(result.current.canStart).toBe(true);

  await act(() => result.current.startPomo(TASK));

  expect(insertPomodoro).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 'u1', taskId: 7, taskName: 'Write tests', durationSec: 1800 })
  );
  expect(result.current.activeTaskId).toBe(7);
  expect(result.current.canStart).toBe(false);
});

it('falls back to 25 minutes when the setting is invalid', async () => {
  mockAuth.user = { id: 'u1', settings: { pomodoroTime: 0 } };
  insertPomodoro.mockResolvedValue(pomo());
  const { result } = await renderPomodoro();
  await act(() => result.current.startPomo(TASK));
  expect(insertPomodoro).toHaveBeenCalledWith(expect.objectContaining({ durationSec: 1500 }));
});

it('does not start a second session while one is active', async () => {
  fetchPomodoros.mockResolvedValue({ active: pomo(), history: [] });
  const { result } = await renderPomodoro();
  await act(() => result.current.startPomo(TASK));
  expect(insertPomodoro).not.toHaveBeenCalled();
});

it('pauses with accumulated elapsed time', async () => {
  fetchPomodoros.mockResolvedValue({ active: pomo(), history: [] });
  const { result } = await renderPomodoro();
  await act(() => result.current.pausePomo());
  expect(result.current.activePomo?.pausedAt).toEqual(expect.any(String));
  expect(result.current.activePomo!.elapsed).toBeGreaterThanOrEqual(60_000);
  expect(pausePomodoroRow).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', id: 1 }));
});

it('rolls back and rethrows when pausing fails', async () => {
  fetchPomodoros.mockResolvedValue({ active: pomo(), history: [] });
  pausePomodoroRow.mockRejectedValue(new Error('boom'));
  const { result } = await renderPomodoro();
  await act(async () => {
    await expect(result.current.pausePomo()).rejects.toThrow('boom');
  });
  expect(result.current.activePomo?.pausedAt).toBeNull();
});

it('resumes a paused session', async () => {
  fetchPomodoros.mockResolvedValue({
    active: pomo({ pausedAt: '2026-01-01T00:00:00Z', elapsed: 5000 }),
    history: [],
  });
  resumePomodoroAndFetch.mockRejectedValue(new Error('skip auto-resume'));
  const { result } = await renderPomodoro();
  expect(result.current.activePomo?.pausedAt).toBeTruthy();

  await act(() => result.current.resumePomo());
  expect(result.current.activePomo?.pausedAt).toBeNull();
  expect(resumePomodoroRow).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', id: 1 }));
});

it('rolls back and rethrows when resuming fails', async () => {
  fetchPomodoros.mockResolvedValue({
    active: pomo({ pausedAt: '2026-01-01T00:00:00Z' }),
    history: [],
  });
  resumePomodoroAndFetch.mockRejectedValue(new Error('skip auto-resume'));
  resumePomodoroRow.mockRejectedValue(new Error('boom'));
  const { result } = await renderPomodoro();
  await act(async () => {
    await expect(result.current.resumePomo()).rejects.toThrow('boom');
  });
  expect(result.current.activePomo?.pausedAt).toBeTruthy();
});

it('ends a session: adds a history record and clears the active one', async () => {
  fetchPomodoros.mockResolvedValue({ active: pomo(), history: [] });
  const { result } = await renderPomodoro();
  await act(() => result.current.endPomo('Write tests'));

  expect(endPomodoroRow).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 'u1', id: 1, taskName: 'Write tests' })
  );
  expect(result.current.activePomo).toBeNull();
  expect(result.current.history).toHaveLength(1);
  expect(result.current.history[0]).toMatchObject({ id: 1, taskName: 'Write tests' });
});

it('names the history record "deleted task" when no title is given', async () => {
  fetchPomodoros.mockResolvedValue({ active: pomo(), history: [] });
  const { result } = await renderPomodoro();
  await act(() => result.current.endPomo());
  expect(result.current.history[0].taskName).toBe('Deleted task');
});

it('keeps the active session when ending fails', async () => {
  fetchPomodoros.mockResolvedValue({ active: pomo(), history: [] });
  endPomodoroRow.mockRejectedValue(new Error('boom'));
  const { result } = await renderPomodoro();
  await act(async () => {
    await expect(result.current.endPomo('Write tests')).rejects.toThrow('boom');
  });
  expect(result.current.activePomo).not.toBeNull();
  expect(result.current.history).toHaveLength(0);
});

describe('resumeIfPaused (on load)', () => {
  it('resumes a session that was frozen on logout', async () => {
    const paused = pomo({ pausedAt: '2026-01-01T00:00:00Z', elapsed: 5000, pausedOnLogout: true });
    fetchPomodoros.mockResolvedValue({ active: paused, history: [] });
    resumePomodoroAndFetch.mockResolvedValue({ ...paused, pausedAt: null });
    const { result } = await renderPomodoro();
    expect(resumePomodoroAndFetch).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', id: 1 })
    );
    expect(result.current.activePomo?.pausedAt).toBeNull();
  });

  it('keeps the paused session when resuming fails', async () => {
    const paused = pomo({ pausedAt: '2026-01-01T00:00:00Z', pausedOnLogout: true });
    fetchPomodoros.mockResolvedValue({ active: paused, history: [] });
    resumePomodoroAndFetch.mockRejectedValue(new Error('boom'));
    const { result } = await renderPomodoro();
    expect(result.current.activePomo?.pausedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('does not resume again when the DEK changes later (e.g. after unlock)', async () => {
    const paused = pomo({ pausedAt: '2026-01-01T00:00:00Z', pausedOnLogout: true });
    fetchPomodoros.mockResolvedValue({ active: paused, history: [] });
    resumePomodoroAndFetch.mockResolvedValue({ ...paused, pausedAt: null });
    const { result, rerender } = await renderPomodoro();
    expect(resumePomodoroAndFetch).toHaveBeenCalledTimes(1);

    // The user pauses by hand, then the app is locked and unlocked (new DEK instance).
    resumePomodoroAndFetch.mockClear();
    fetchPomodoros.mockResolvedValue({ active: { ...paused, pausedOnLogout: false }, history: [] });
    mockAuth.dek = new Uint8Array(32).fill(2);
    await rerender({});
    await waitFor(() => expect(fetchPomodoros).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(resumePomodoroAndFetch).not.toHaveBeenCalled();
  });

  it('never resumes a session that was paused by hand, on any load', async () => {
    const paused = pomo({ pausedAt: '2026-01-01T00:00:00Z', pausedOnLogout: false });
    fetchPomodoros.mockResolvedValue({ active: paused, history: [] });
    const { result } = await renderPomodoro();
    expect(resumePomodoroAndFetch).not.toHaveBeenCalled();
    expect(result.current.activePomo?.pausedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('resumes again for a new sign-in after signing out', async () => {
    const paused = pomo({ pausedAt: '2026-01-01T00:00:00Z', pausedOnLogout: true });
    fetchPomodoros.mockResolvedValue({ active: paused, history: [] });
    resumePomodoroAndFetch.mockResolvedValue({ ...paused, pausedAt: null });
    const { rerender } = await renderPomodoro();
    expect(resumePomodoroAndFetch).toHaveBeenCalledTimes(1);

    mockAuth.user = null;
    await rerender({});
    mockAuth.user = { id: 'u1', settings: { pomodoroTime: 30 } };
    await rerender({});
    await waitFor(() => expect(resumePomodoroAndFetch).toHaveBeenCalledTimes(2));
  });

  it('does not fetch while the DEK is not available', async () => {
    mockAuth.dek = null;
    const { result } = await renderHook(() => usePomodoro(), { wrapper });
    await act(async () => {});
    expect(fetchPomodoros).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });

  it('keeps action identities stable across state changes', async () => {
    insertPomodoro.mockResolvedValue(pomo());
    const { result } = await renderPomodoro();
    const { startPomo, pausePomo, endPomo } = result.current;
    await act(() => result.current.startPomo(TASK));
    expect(result.current.startPomo).toBe(startPomo);
    expect(result.current.pausePomo).toBe(pausePomo);
    expect(result.current.endPomo).toBe(endPomo);
  });

  it('does not auto-resume on refetch', async () => {
    const paused = pomo({ pausedAt: '2026-01-01T00:00:00Z', pausedOnLogout: true });
    fetchPomodoros.mockResolvedValue({ active: paused, history: [] });
    resumePomodoroAndFetch.mockResolvedValue({ ...paused, pausedAt: null });
    const { result } = await renderPomodoro();
    resumePomodoroAndFetch.mockClear();
    await act(() => result.current.refetch());
    expect(resumePomodoroAndFetch).not.toHaveBeenCalled();
  });
});

it('clears state when there is no user', async () => {
  mockAuth.user = null;
  const { result } = await renderPomodoro();
  expect(result.current.activePomo).toBeNull();
  expect(result.current.history).toEqual([]);
  expect(fetchPomodoros).not.toHaveBeenCalled();
});

describe('optimistic start', () => {
  it('shows the session before the write finishes', async () => {
    let finish!: () => void;
    insertPomodoro.mockImplementation(
      (o: any) => new Promise((res) => (finish = () => res(pomo({ id: o.id }))))
    );
    const { result } = await renderPomodoro();

    let started!: Promise<void>;
    await act(async () => {
      started = result.current.startPomo(TASK);
    });
    expect(result.current.activeTaskId).toBe(7);
    expect(insertPomodoro).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.any(Number) })
    );

    await act(async () => {
      finish();
    });
    await started;
    expect(result.current.activeTaskId).toBe(7);
  });

  it('adopts the server id and pauses with it', async () => {
    let finish!: () => void;
    insertPomodoro.mockImplementation(
      () => new Promise((res) => (finish = () => res(pomo({ id: 99 }))))
    );
    const { result } = await renderPomodoro();

    let started!: Promise<void>;
    let paused!: Promise<void>;
    await act(async () => {
      started = result.current.startPomo(TASK);
    });
    await act(async () => {
      paused = result.current.pausePomo();
    });
    expect(pausePomodoroRow).not.toHaveBeenCalled();

    await act(async () => {
      finish();
    });
    await started;
    await paused;
    expect(pausePomodoroRow).toHaveBeenCalledWith(expect.objectContaining({ id: 99 }));
    expect(result.current.activePomo?.id).toBe(99);
  });

  it('keeps the new session when a refresh returns a snapshot without it', async () => {
    let finish!: () => void;
    insertPomodoro.mockImplementation(
      (o: any) => new Promise((res) => (finish = () => res(pomo({ id: o.id }))))
    );
    const { result } = await renderPomodoro();

    let started!: Promise<void>;
    await act(async () => {
      started = result.current.startPomo(TASK);
    });
    // e.g. a sync round finishing before the insert is visible in the store
    await act(() => result.current.refetch());
    expect(result.current.activeTaskId).toBe(7);

    await act(async () => {
      finish();
    });
    await started;
    expect(result.current.activeTaskId).toBe(7);
  });

  it('rolls back and rethrows when the write fails', async () => {
    insertPomodoro.mockRejectedValue(new Error('boom'));
    const { result } = await renderPomodoro();
    await act(async () => {
      await expect(result.current.startPomo(TASK)).rejects.toThrow('boom');
    });
    expect(result.current.activePomo).toBeNull();
  });
});
