import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  getPomodoroNotificationPermission,
  requestPomodoroNotificationPermission,
  type NotificationPermissionState,
} from '@/features/pomodoro/lib/notifications';

export interface NotificationPermission {
  /** Null until the first read finishes. */
  state: NotificationPermissionState | null;
  /** True when the last request ended without an answer (the browser hid its prompt). */
  promptSuppressed: boolean;
  /** Call straight from a press handler: browsers only prompt during a user gesture. */
  request: () => Promise<void>;
}

/** Current notification permission, re-read whenever the app (or tab) comes back to front. */
export function useNotificationPermission(): NotificationPermission {
  const [state, setState] = useState<NotificationPermissionState | null>(null);
  const [promptSuppressed, setPromptSuppressed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const read = () => {
      void getPomodoroNotificationPermission().then((next) => {
        if (!cancelled) setState(next);
      });
    };
    read();
    // Permission can change in the browser / system settings while the app is open.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') read();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const request = useCallback(async () => {
    const next = await requestPomodoroNotificationPermission();
    setState(next);
    setPromptSuppressed(next === 'default');
  }, []);

  return { state, promptSuppressed, request };
}
