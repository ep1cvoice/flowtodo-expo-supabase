import { DecryptionError } from '@/core/crypto/decryptColumn';
import { mapActivePomo, mapPomoRecord } from '@/features/pomodoro/lib/pomoMappers';

jest.mock('@/core/crypto', () => ({
  decryptField: (_dek: Uint8Array, ciphertext: string, iv: string) => {
    if (ciphertext === 'bad') throw new Error('decrypt failed');
    return `dec(${ciphertext}:${iv})`;
  },
}));

const dek = new Uint8Array(32);

const baseRow = {
  id: 7,
  user_id: 'u1',
  task_id: 42,
  task_name_enc: null,
  task_name_iv: null,
  duration: 25,
  elapsed: 120000,
  started_at: '2026-01-02T10:00:00Z',
  paused_at: null,
  ended_at: null,
  created_at: '2026-01-02T10:00:00Z',
};

describe('pomo mappers', () => {
  it('maps an active pomodoro', () => {
    expect(mapActivePomo(baseRow)).toEqual({
      id: 7,
      taskId: 42,
      startedAt: '2026-01-02T10:00:00Z',
      endedAt: null,
      duration: 25,
      elapsed: 120000,
      pausedAt: null,
    });
  });

  it('decrypts the task name of a history record', () => {
    expect(
      mapPomoRecord(
        { ...baseRow, ended_at: '2026-01-02T10:25:00Z', task_name_enc: 'name', task_name_iv: 'iv' },
        dek
      )
    ).toEqual({
      id: 7,
      taskId: 42,
      taskName: 'dec(name:iv)',
      startedAt: '2026-01-02T10:00:00Z',
      endedAt: '2026-01-02T10:25:00Z',
      elapsed: 120000,
      duration: 25,
    });
  });

  it('uses the placeholder only when no name was stored at all', () => {
    expect(
      mapPomoRecord({ ...baseRow, ended_at: '2026-01-02T10:25:00Z', task_id: null }, dek)
    ).toMatchObject({ taskId: 0, taskName: 'Deleted task' });
  });

  it('throws instead of masking a failed decryption', () => {
    const row = { ...baseRow, ended_at: '2026-01-02T10:25:00Z' };

    expect(() => mapPomoRecord({ ...row, task_name_enc: 'bad', task_name_iv: 'iv' }, dek)).toThrow(
      DecryptionError
    );
    expect(() => mapPomoRecord({ ...row, task_name_enc: 'bad', task_name_iv: 'iv' }, dek)).toThrow(
      'Failed to decrypt pomodoros#7.task_name'
    );
    // key not available (app locked)
    expect(() => mapPomoRecord({ ...row, task_name_enc: 'name', task_name_iv: 'iv' }, null)).toThrow(
      /pomodoros#7\.task_name.*not available/
    );
    // half-stored value is corrupt, not "no name"
    expect(() => mapPomoRecord({ ...row, task_name_enc: 'name', task_name_iv: null }, dek)).toThrow(
      /pomodoros#7\.task_name: IV is missing/
    );
  });
});
