import { localPomodoroStore } from '@/features/pomodoro/lib/store/localStore';

/** Native is local-first, like the task store. */
export const pomodoroStore = localPomodoroStore;
