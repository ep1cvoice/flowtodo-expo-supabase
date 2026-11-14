import type { PomoData, PomoRecord } from '@/types';
import type { PomoStatsRow } from '@/features/pomodoro/lib/stats';

/**
 * Everything the pomodoro feature needs from persistence. Native uses a local SQLite replica
 * (synced to Supabase together with the tasks); the online-only build talks to Supabase.
 */
export interface PomodoroStore {
  fetchPomodoros(
    userId: string,
    dek: Uint8Array | null
  ): Promise<{ active: PomoData | null; history: PomoRecord[] }>;
  /** Finished sessions since `sinceIso`; only unencrypted columns, so no DEK is needed. */
  fetchStatsRows(userId: string, sinceIso: string): Promise<PomoStatsRow[]>;
  insertPomodoro(options: {
    userId: string;
    dek: Uint8Array;
    taskId: number;
    taskName: string;
    durationSec: number;
    startedAt: string;
  }): Promise<PomoData>;
  pausePomodoroRow(options: {
    userId: string;
    id: number;
    elapsed: number;
    pausedAt: string;
    onlyActive?: boolean;
    /** True when freezing the session because the user is logging out. */
    onLogout?: boolean;
  }): Promise<void>;
  resumePomodoroRow(options: { userId: string; id: number; startedAt: string }): Promise<void>;
  /** Same as resumePomodoroRow, but returns the refreshed row (used after login). */
  resumePomodoroAndFetch(options: {
    userId: string;
    id: number;
    startedAt: string;
  }): Promise<PomoData>;
  endPomodoroRow(options: {
    userId: string;
    dek: Uint8Array;
    id: number;
    elapsed: number;
    endedAt: string;
    taskName: string;
  }): Promise<void>;
  deletePomodoroRecord(userId: string, id: number): Promise<void>;
}
