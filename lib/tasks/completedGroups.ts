import type { Task } from '@/types';

export type CompletedTaskSection = {
  /** Stable section id: today | yesterday | YYYY-MM-DD | unknown */
  key: string;
  title: string;
  data: Task[];
};

/** Local calendar day at 00:00:00.000. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDayKey(dayStart: Date): string {
  const y = dayStart.getFullYear();
  const m = String(dayStart.getMonth() + 1).padStart(2, '0');
  const d = String(dayStart.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** e.g. "Aug 11" same year, "Aug 11, 2025" otherwise. */
export function formatCompletedDayLabel(dayStart: Date, now: Date = new Date()): string {
  const sameYear = dayStart.getFullYear() === now.getFullYear();
  return dayStart.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export type CompletedSectionMeta = {
  key: string;
  title: string;
  /** Newer days first; unknown last. */
  sortKey: number;
};

/** Resolve section meta for a completed_at value. */
export function getCompletedSectionMeta(
  completedAt: string | null | undefined,
  now: Date = new Date()
): CompletedSectionMeta {
  if (!completedAt) {
    return { key: 'unknown', title: 'Unknown', sortKey: Number.NEGATIVE_INFINITY };
  }
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) {
    return { key: 'unknown', title: 'Unknown', sortKey: Number.NEGATIVE_INFINITY };
  }

  const dayStart = startOfLocalDay(completed);
  const day = dayStart.getTime();
  const today = startOfLocalDay(now).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const yesterday = today - dayMs;

  if (day === today) {
    return { key: 'today', title: 'Today', sortKey: day };
  }
  if (day === yesterday) {
    return { key: 'yesterday', title: 'Yesterday', sortKey: day };
  }
  return {
    key: toDayKey(dayStart),
    title: formatCompletedDayLabel(dayStart, now),
    sortKey: day,
  };
}

/**
 * Group completed tasks by completion day.
 * Today / Yesterday keep relative labels; older days use a concrete date.
 * Preserves input order within each section (caller should sort newest-first).
 */
export function groupCompletedTasks(
  tasks: Task[],
  now: Date = new Date()
): CompletedTaskSection[] {
  const buckets = new Map<string, { meta: CompletedSectionMeta; data: Task[] }>();

  for (const task of tasks) {
    const meta = getCompletedSectionMeta(task.completedAt, now);
    const existing = buckets.get(meta.key);
    if (existing) {
      existing.data.push(task);
    } else {
      buckets.set(meta.key, { meta, data: [task] });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.meta.sortKey - a.meta.sortKey)
    .map(({ meta, data }) => ({
      key: meta.key,
      title: meta.title,
      data,
    }));
}
