import {
  buildDayStrip,
  collectMarkedDayKeys,
  sameDay,
  startOfDay,
  taskMatchesScheduledDay,
  toDayKey,
  toScheduledIso,
} from '@/lib/calendarDate';
import type { Task } from '@/types';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: '',
    done: false,
    scheduled: null,
    completedAt: null,
    created: '2026-01-01T00:00:00Z',
    categoryId: null,
    category: null,
    sortOrder: partial.id,
    tags: [],
    ...partial,
  };
}

describe('calendarDate', () => {
  it('sameDay and toDayKey', () => {
    const a = new Date(2026, 7, 18, 9, 0);
    const b = new Date(2026, 7, 18, 23, 0);
    const c = new Date(2026, 7, 19, 0, 0);
    expect(sameDay(a, b)).toBe(true);
    expect(sameDay(a, c)).toBe(false);
    expect(toDayKey(a)).toBe('2026-08-18');
  });

  it('taskMatchesScheduledDay filters by local day', () => {
    const day = startOfDay(new Date(2026, 7, 18));
    const due = task({
      id: 1,
      title: 'Due',
      scheduled: new Date(2026, 7, 18, 12, 0).toISOString(),
    });
    const other = task({
      id: 2,
      title: 'Other',
      scheduled: new Date(2026, 7, 19, 12, 0).toISOString(),
    });
    const none = task({ id: 3, title: 'None', scheduled: null });

    expect(taskMatchesScheduledDay(due, null)).toBe(true);
    expect(taskMatchesScheduledDay(due, day)).toBe(true);
    expect(taskMatchesScheduledDay(other, day)).toBe(false);
    expect(taskMatchesScheduledDay(none, day)).toBe(false);
  });

  it('collectMarkedDayKeys', () => {
    const keys = collectMarkedDayKeys([
      task({ id: 1, title: 'A', scheduled: new Date(2026, 7, 18, 12).toISOString() }),
      task({ id: 2, title: 'B', scheduled: new Date(2026, 7, 18, 15).toISOString() }),
      task({ id: 3, title: 'C', scheduled: null }),
    ]);
    expect([...keys]).toEqual(['2026-08-18']);
  });

  it('buildDayStrip centers around today', () => {
    const today = startOfDay(new Date(2026, 7, 18));
    const strip = buildDayStrip(today, 14, 6);
    expect(strip).toHaveLength(14);
    expect(sameDay(strip[6], today)).toBe(true);
  });

  it('toScheduledIso uses noon local', () => {
    const d = startOfDay(new Date(2026, 7, 18));
    const iso = toScheduledIso(d);
    const parsed = new Date(iso);
    expect(parsed.getHours()).toBe(12);
    expect(parsed.getDate()).toBe(18);
  });
});
