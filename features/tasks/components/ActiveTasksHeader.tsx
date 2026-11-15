import ActiveDayCalendar from '@/features/tasks/components/calendar/ActiveDayCalendar';
import MonthCalendar from '@/features/tasks/components/calendar/MonthCalendar';
import type { ActiveTasksView } from '@/features/tasks/lib/useActiveTasksScreen';

// Day strip or full month calendar (per the saved view mode) shown above the task list.
export default function ActiveTasksHeader({ filters }: { filters: ActiveTasksView['filters'] }) {
  const Calendar = filters.viewMode === 'month' ? MonthCalendar : ActiveDayCalendar;
  return (
    <Calendar
      selectedDay={filters.selectedDay}
      onSelectDay={filters.setSelectedDay}
      dayTaskCounts={filters.dayTaskCounts}
    />
  );
}
