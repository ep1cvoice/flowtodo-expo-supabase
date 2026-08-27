import { mapActivePomo, mapPomoRecord } from '@/lib/pomodoro/pomoMappers';

const baseRow = {
  id: 7,
  user_id: 'u1',
  task_id: 42,
  task_name: 'Focus block',
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

  it('maps a history record and falls back for deleted task name', () => {
    expect(
      mapPomoRecord({
        ...baseRow,
        ended_at: '2026-01-02T10:25:00Z',
        task_id: null,
        task_name: '',
      }, null)
    ).toEqual({
      id: 7,
      taskId: 0,
      taskName: 'Deleted task',
      startedAt: '2026-01-02T10:00:00Z',
      endedAt: '2026-01-02T10:25:00Z',
      elapsed: 120000,
      duration: 25,
    });
  });
});
