import { strings } from '@/shared/lib/strings';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Pause, Play, X } from 'lucide-react-native';
import { usePomodoroActions, usePomodoroState } from '@/features/pomodoro/PomodoroContext';
import { usePomodoroScreenStyles } from '@/features/pomodoro/components/pomodoroScreenStyles';
import { useTasksState } from '@/features/tasks/TasksContext';
import { displaySeconds } from '@/features/pomodoro/lib/displayTime';
import { useAuth } from '@/core/auth/AuthContext';
import { formatClock } from '@/features/pomodoro/lib/formatClock';
import { useToastedAction } from '@/shared/lib/useToastedAction';

// The alarm itself is owned by the pinned PomodoroMiniBar; this card only mirrors and
// controls the running session.
export default function ActiveSessionCard() {
  const { styles, colors } = usePomodoroScreenStyles();
  const { activePomo } = usePomodoroState();
  const { pausePomo, resumePomo, endPomo, getElapsedSeconds } = usePomodoroActions();
  const { activeTasks } = useTasksState();
  const { user } = useAuth();
  const mode = user?.settings?.pomodoroMode ?? 'countdown';
  const runToasted = useToastedAction();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activePomo) return;
    const tick = () => setElapsed(getElapsedSeconds(activePomo));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activePomo, getElapsedSeconds]);

  if (!activePomo) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>{strings.pomodoro.activeSession}</Text>
        <Text style={styles.description}>{strings.pomodoro.noActiveSession}</Text>
      </View>
    );
  }

  const task = activeTasks.find((t) => t.id === activePomo.taskId);
  const paused = !!activePomo.pausedAt;
  const shown = displaySeconds(mode, elapsed, Number(activePomo.duration));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{strings.pomodoro.activeSession}</Text>
      {task ? (
        <Text style={styles.activeTitle} numberOfLines={2}>
          {task.title}
        </Text>
      ) : null}
      <Text style={styles.activeTime}>{formatClock(shown)}</Text>
      <Text style={styles.description}>
        {paused
          ? strings.pomodoro.paused
          : mode === 'countup'
            ? strings.pomodoro.elapsedLabel
            : strings.pomodoro.remaining}
      </Text>
      <View style={styles.activeActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? strings.pomodoro.resume : strings.pomodoro.pause}
          style={({ pressed, hovered }) => [
            styles.primaryBtn,
            (hovered || pressed) && styles.primaryBtnPressed,
          ]}
          onPress={() =>
            void runToasted(paused ? resumePomo : pausePomo, strings.pomodoro.sessionActionFailed)
          }>
          {paused ? <Play size={20} color="#fff" /> : <Pause size={20} color="#fff" />}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.pomodoro.endPomodoro}
          style={({ pressed, hovered }) => [styles.secondaryBtn, (hovered || pressed) && { opacity: 0.8 }]}
          onPress={() =>
            void runToasted(() => endPomo(task?.title), strings.pomodoro.sessionActionFailed)
          }>
          <X size={20} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}
