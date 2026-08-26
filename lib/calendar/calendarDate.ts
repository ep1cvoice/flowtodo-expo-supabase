import type { Task } from '@/types';

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
}

export function toScheduledIso(date: Date): string {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);
  return normalized.toISOString();
}

export function buildMonthWeeks(monthCursor: Date): (Date | null)[][] {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export function buildDayStrip(today: Date, total = 14, halfBefore = 6): Date[] {
  const base = startOfDay(today);
  const days: Date[] = [];
  for (let offset = -halfBefore; offset < total - halfBefore; offset++) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    days.push(d);
  }
  return days;
}

export function taskMatchesScheduledDay(
  task: Pick<Task, 'scheduled'>,
  selectedDay: Date | null
): boolean {
  if (!selectedDay) return true;
  if (!task.scheduled) return false;
  const scheduled = new Date(task.scheduled);
  if (Number.isNaN(scheduled.getTime())) return false;
  return sameDay(scheduled, selectedDay);
}

export function collectMarkedDayKeys(
  tasks: Pick<Task, 'scheduled'>[]
): Set<string> {
  const keys = new Set<string>();
  for (const task of tasks) {
    if (!task.scheduled) continue;
    const d = new Date(task.scheduled);
    if (Number.isNaN(d.getTime())) continue;
    keys.add(toDayKey(d));
  }
  return keys;
}
