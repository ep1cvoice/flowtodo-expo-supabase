import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalendarViewMode = 'days' | 'month';

const VIEW_MODE_STORAGE_KEY = '@flowtodo/calendar-view-mode';

function isCalendarViewMode(value: unknown): value is CalendarViewMode {
  return value === 'days' || value === 'month';
}

/** Compact day strip vs. full month calendar, persisted across launches. */
export function useCalendarViewMode() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('days');

  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY)
      .then((value) => {
        if (isCalendarViewMode(value)) setViewMode(value);
      })
      .catch(() => {});
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((current) => {
      const next: CalendarViewMode = current === 'days' ? 'month' : 'days';
      AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  return { viewMode, toggleViewMode };
}
