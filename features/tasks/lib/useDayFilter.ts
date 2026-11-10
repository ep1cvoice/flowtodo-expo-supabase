import { useMemo, useState } from 'react';
import { collectDayTaskCounts } from '@/features/tasks/lib/calendarDate';
import type { Task } from '@/types';

/** Selected calendar day plus the per-day task counts shown in the calendar. */
export function useDayFilter(activeTasks: Task[]) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const dayTaskCounts = useMemo(() => collectDayTaskCounts(activeTasks), [activeTasks]);

  return { selectedDay, setSelectedDay, hasDayFilter: selectedDay != null, dayTaskCounts };
}
