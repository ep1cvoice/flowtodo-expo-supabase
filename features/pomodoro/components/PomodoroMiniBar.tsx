import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlarmClock, Pause, Play, X } from 'lucide-react-native';
import { usePomodoroState, usePomodoroActions } from '@/features/pomodoro/PomodoroContext';
import { useTasksState } from '@/features/tasks/TasksContext';
import { displaySeconds } from '@/features/pomodoro/lib/displayTime';
import { useAuth } from '@/core/auth/AuthContext';
import { formatClock } from '@/features/pomodoro/lib/formatClock';
import { playPomodoroAlarm, stopPomodoroAlarm } from '@/features/pomodoro/pomodoroAlarm';
import TomatoIcon from '@/features/pomodoro/components/TomatoIcon';
import {
  usePomodoroMiniBarStyles,
  POMO_RED,
} from '@/features/pomodoro/components/PomodoroMiniBarStyles';
import AppModal from '@/shared/ui/AppModal';
import { useTheme } from '@/shared/providers/ThemeContext';
import { strings } from '@/shared/lib/strings';

interface Props {
  onOpen: () => void;
  /** Keeps the alarm and ticking alive while the strip itself is not shown. */
  hidden?: boolean;
}

// Red strip pinned to the top of the tab bar while a session is running. It owns the
// session controls (pause / resume / cancel) and the end-of-session alarm; tapping the
// body opens the full Pomodoro screen.
export default function PomodoroMiniBar({ onOpen, hidden = false }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const mode = user?.settings?.pomodoroMode ?? 'countdown';
  const { styles } = usePomodoroMiniBarStyles();
  const { activePomo } = usePomodoroState();
  const { pausePomo, resumePomo, endPomo, getElapsedSeconds } = usePomodoroActions();
  const { activeTasks } = useTasksState();
  // Re-renders once per second while a session exists; the elapsed time itself is computed
  // during render, so the clock is current from the very first frame.
  const [, setTick] = useState(0);
  // Session whose alarm the user dismissed (hides the modal while `endPomo` is running).
  const [dismissedId, setDismissedId] = useState<number | null>(null);
  // Session the alarm already rang for, so it rings (and pauses) only once.
  const alarmedIdRef = useRef<number | null>(null);

  const elapsed = activePomo ? getElapsedSeconds(activePomo) : 0;
  const duration = Number(activePomo?.duration) || 0;
  const timeUp = !!activePomo && mode === 'countdown' && duration > 0 && elapsed >= duration;
  const showAlarm = timeUp && dismissedId !== activePomo.id;

  useEffect(() => {
    if (!activePomo) {
      void stopPomodoroAlarm();
      return;
    }
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activePomo]);

  useEffect(() => {
    if (!activePomo || !timeUp || alarmedIdRef.current === activePomo.id) return;
    alarmedIdRef.current = activePomo.id;
    if (!activePomo.pausedAt) void pausePomo();
    void playPomodoroAlarm();
  }, [activePomo, timeUp, pausePomo]);

  useEffect(() => {
    return () => {
      void stopPomodoroAlarm();
    };
  }, []);

  if (!activePomo) return null;

  const task = activeTasks.find((t) => t.id === activePomo.taskId);
  const isPaused = !!activePomo.pausedAt || showAlarm;
  const shown = displaySeconds(mode, elapsed, duration);

  const stopAlarmAndEnd = () => {
    void stopPomodoroAlarm();
    setDismissedId(activePomo.id);
    void endPomo(task?.title);
  };

  const togglePause = () => {
    if (showAlarm) return;
    if (isPaused) void resumePomo();
    else void pausePomo();
  };

  return (
    <>
      {hidden ? null : (
        <View style={styles.bar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.pomodoro.openFullscreen}
            onPress={onOpen}
            style={({ pressed, hovered }) => [styles.body, (pressed || hovered) && styles.pressed]}
          >
            <TomatoIcon size={18} color={POMO_RED} />
            <Text style={styles.time}>{formatClock(shown)}</Text>
            <Text style={styles.title} numberOfLines={1}>
              {isPaused ? strings.pomodoro.paused : (task?.title ?? strings.pomodoro.activeSession)}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPaused ? strings.pomodoro.resume : strings.pomodoro.pause}
            onPress={togglePause}
            hitSlop={6}
            style={({ pressed, hovered }) => [styles.btn, (pressed || hovered) && styles.pressed]}
          >
            {isPaused && !showAlarm ? (
              <Play size={18} color={POMO_RED} />
            ) : (
              <Pause size={18} color={POMO_RED} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.pomodoro.endPomodoro}
            onPress={stopAlarmAndEnd}
            hitSlop={6}
            style={({ pressed, hovered }) => [styles.btn, (pressed || hovered) && styles.pressed]}
          >
            <X size={18} color={POMO_RED} />
          </Pressable>
        </View>
      )}
      <AppModal visible={showAlarm} onClose={stopAlarmAndEnd}>
        <Pressable style={styles.alarmOverlay} onPress={stopAlarmAndEnd}>
          <Pressable style={styles.alarmModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.alarmHeader}>
              <Text style={styles.alarmTitle}>{strings.pomodoro.takeBreak}</Text>
              <AlarmClock size={22} color={colors.primary} />
            </View>
            <Text style={styles.alarmText}>{strings.pomodoro.finished}</Text>
            <Pressable
              onPress={stopAlarmAndEnd}
              style={({ pressed, hovered }) => [
                styles.okBtn,
                (hovered || pressed) && styles.okBtnPressed,
              ]}
            >
              <Text style={styles.okBtnText}>{strings.common.ok}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </AppModal>
    </>
  );
}
