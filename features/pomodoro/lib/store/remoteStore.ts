import {
  deletePomodoroRecord,
  endPomodoroRow,
  insertPomodoro,
  pausePomodoroRow,
  resumePomodoroAndFetch,
  resumePomodoroRow,
} from '@/features/pomodoro/lib/mutations';
import { fetchPomodoroStatsRows, fetchPomodoros } from '@/features/pomodoro/lib/queries';
import type { PomodoroStore } from '@/features/pomodoro/lib/store/types';

/** Online-only store: every call goes straight to Supabase. */
export const remotePomodoroStore: PomodoroStore = {
  fetchPomodoros,
  fetchStatsRows: fetchPomodoroStatsRows,
  insertPomodoro,
  pausePomodoroRow,
  resumePomodoroRow,
  resumePomodoroAndFetch,
  endPomodoroRow,
  deletePomodoroRecord,
};
