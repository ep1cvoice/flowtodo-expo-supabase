import { remotePomodoroStore } from '@/features/pomodoro/lib/store/remoteStore';

/** Always the online-only store. Used by Jest, which has no SQLite. */
export const pomodoroStore = remotePomodoroStore;
