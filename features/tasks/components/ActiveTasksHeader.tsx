import ActiveDayCalendar from '@/features/tasks/components/calendar/ActiveDayCalendar';
import type { ActiveTasksView } from '@/features/tasks/lib/useActiveTasksScreen';

// Day strip shown above the task list (and above the loading indicator).
export default function ActiveTasksHeader({ filters }: { filters: ActiveTasksView['filters'] }) {
  return (
    <ActiveDayCalendar
      selectedDay={filters.selectedDay}
      onSelectDay={filters.setSelectedDay}
      dayTaskCounts={filters.dayTaskCounts}
    />
  );
}
