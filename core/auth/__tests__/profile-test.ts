import { createBuilder } from '@/test/supabaseMock';

jest.mock('@/core/supabase/client', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/core/auth/constants', () => ({
  PROFILE_FETCH_TIMEOUT_MS: 1000,
  PROFILE_RETRY_ATTEMPTS: 3,
  PROFILE_RETRY_DELAY_MS: 0,
}));
jest.mock('@/shared/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { supabase } from '@/core/supabase/client';
import { logger } from '@/shared/lib/logger';
import { fetchProfile, fetchProfileRow } from '@/core/auth/profile';
import { cacheProfileRow } from '@/core/auth/offlineCache';

const from = supabase.from as jest.Mock;

const row = {
  username: 'ann',
  theme: 'dark',
  notification_type: 'sound',
  pomodoro_time: '25',
  pomodoro_mode: 'countup',
  view: 'list',
  max_filter_selections: 99,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchProfile', () => {
  it('maps the row to a user on the first attempt', async () => {
    from.mockReturnValue(createBuilder({ data: row }));
    const user = await fetchProfile('u1', 'a@b.c');

    expect(from).toHaveBeenCalledTimes(1);
    expect(user).toMatchObject({
      id: 'u1',
      email: 'a@b.c',
      username: 'ann',
      settings: { theme: 'dark', notificationType: 'sound', pomodoroTime: 25, pomodoroMode: 'countup', view: 'list' },
    });
  });

  it('retries after an error result and returns the profile once it succeeds', async () => {
    from
      .mockReturnValueOnce(createBuilder({ error: { message: 'boom' } }))
      .mockReturnValueOnce(createBuilder({ data: row }));

    const user = await fetchProfile('u1', undefined);

    expect(from).toHaveBeenCalledTimes(2);
    expect(user?.username).toBe('ann');
    expect(user?.email).toBe('');
  });

  it('returns null after exhausting attempts on error results', async () => {
    from.mockImplementation(() => createBuilder({ error: { message: 'boom' } }));

    expect(await fetchProfile('u1', 'a@b.c')).toBeNull();
    expect(from).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledWith('fetchProfile failed after retries:', 'boom');
  });

  it('retries thrown errors and returns null after exhausting attempts', async () => {
    from.mockImplementation(() => {
      throw new Error('network down');
    });

    expect(await fetchProfile('u1', 'a@b.c')).toBeNull();
    expect(from).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledWith('fetchProfile threw after retries:', 'network down');
  });
});

describe('fetchProfileRow sharing', () => {
  it('concurrent callers share one query; a later call fetches fresh data', async () => {
    from.mockImplementation(() => createBuilder({ data: row }));
    const { fetchProfileRow } = require('@/core/auth/profile');

    await Promise.all([fetchProfileRow('u1'), fetchProfileRow('u1'), fetchProfile('u1', 'a@b.c')]);
    expect(from).toHaveBeenCalledTimes(1);

    await fetchProfileRow('u1');
    expect(from).toHaveBeenCalledTimes(2);
  });
});


describe('offline fallback', () => {
  const offline = { message: 'TypeError: Network request failed' };

  it('does not retry when the request never reached the server, and uses the cached row', async () => {
    await cacheProfileRow('u9', { ...row, salt: 'cached-salt' });
    from.mockImplementation(() => createBuilder({ error: offline }));

    const result = await fetchProfileRow('u9');

    expect(from).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ salt: 'cached-salt' });
  });

  it('fails when offline and nothing is cached', async () => {
    from.mockImplementation(() => createBuilder({ error: offline }));
    await expect(fetchProfileRow('nobody')).rejects.toThrow();
  });

  it('caches the row after a successful fetch', async () => {
    from.mockReturnValueOnce(createBuilder({ data: { ...row, salt: 'fresh' } }));
    await fetchProfileRow('u10');
    await new Promise<void>((r) => setImmediate(r));
    from.mockImplementation(() => createBuilder({ error: offline }));
    expect(await fetchProfileRow('u10')).toMatchObject({ salt: 'fresh' });
  });

  it('does not use the cache for server-side errors', async () => {
    await cacheProfileRow('u11', row);
    from.mockImplementation(() => createBuilder({ error: { message: 'permission denied' } }));
    await expect(fetchProfileRow('u11')).rejects.toThrow();
    expect(from).toHaveBeenCalledTimes(3);
  });
});
