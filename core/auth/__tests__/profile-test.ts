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
import { fetchProfile } from '@/core/auth/profile';

const from = supabase.from as jest.Mock;

const row = {
  username: 'ann',
  theme: 'dark',
  notification_type: 'sound',
  pomodoro_time: '25',
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
      settings: { theme: 'dark', notificationType: 'sound', pomodoroTime: 25, view: 'list' },
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
