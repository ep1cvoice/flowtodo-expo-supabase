import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AlarmClock, Pause, Play, X } from 'lucide-react-native';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { usePomodoro } from '@/context/PomodoroContext';
import { useTheme } from '@/context/ThemeContext';
import { playPomodoroAlarm, stopPomodoroAlarm } from '@/utils/pomodoroAlarm';
import AppModal from '@/components/ui/AppModal';
import { webInteractive } from '@/utils/pressableWeb';

interface PomodoroTimerProps {
  taskId: number;
}

function formatTime(total: number): string {
  const safe = Number.isNaN(total) || total < 0 ? 0 : Math.floor(total);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PomodoroTimer({ taskId }: PomodoroTimerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    activeTaskId,
    activePomo,
    pausePomo,
    resumePomo,
    endPomo,
    getElapsedSeconds,
  } = usePomodoro();

  const show = activeTaskId === taskId && !!activePomo;
  const [seconds, setSeconds] = useState(0);
  const [showAlarm, setShowAlarm] = useState(false);
  const alarmedRef = useRef(false);

  useEffect(() => {
    if (!show || !activePomo) {
      setSeconds(0);
      setShowAlarm(false);
      alarmedRef.current = false;
      void stopPomodoroAlarm();
      return;
    }

    const tick = () => {
      const total = getElapsedSeconds(activePomo);
      setSeconds(total);
      const duration = Number(activePomo.duration) || 0;
      if (!alarmedRef.current && duration > 0 && total >= duration) {
        alarmedRef.current = true;
        setShowAlarm(true);
        if (!activePomo.pausedAt) void pausePomo();
        void playPomodoroAlarm();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [show, activePomo, getElapsedSeconds, pausePomo]);

  useEffect(() => {
    return () => {
      void stopPomodoroAlarm();
    };
  }, []);

  if (!show || !activePomo) return null;

  const isPaused = !!activePomo.pausedAt || showAlarm;

  const stopAlarmAndEnd = () => {
    void stopPomodoroAlarm();
    setShowAlarm(false);
    void endPomo();
  };

  const handleDismissAlarm = () => {
    stopAlarmAndEnd();
  };

  return (
    <>
      <View style={styles.row}>
        <Text style={styles.time}>{formatTime(seconds)}</Text>

        <Pressable
          onPress={() => {
            if (showAlarm) return;
            if (isPaused) void resumePomo();
            else void pausePomo();
          }}
          hitSlop={8}
          style={({ pressed, hovered }) => [
            styles.btn,
            (hovered || pressed) && styles.btnPressed,
          ]}
          accessibilityLabel={isPaused ? 'Resume pomodoro' : 'Pause pomodoro'}>
          {isPaused && !showAlarm ? (
            <Play size={14} color={colors.textPrimary} />
          ) : (
            <Pause size={14} color={colors.textPrimary} />
          )}
        </Pressable>

        <Pressable
          onPress={stopAlarmAndEnd}
          hitSlop={8}
          style={({ pressed, hovered }) => [
            styles.btn,
            (hovered || pressed) && styles.btnPressed,
          ]}
          accessibilityLabel="End pomodoro">
          <X size={14} color={colors.textPrimary} />
        </Pressable>
      </View>

      <AppModal visible={showAlarm} onClose={handleDismissAlarm}>
        <Pressable style={styles.alarmOverlay} onPress={handleDismissAlarm}>
          <Pressable style={styles.alarmModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.alarmHeader}>
              <Text style={styles.alarmTitle}>Take a break</Text>
              <AlarmClock size={22} color={colors.primary} />
            </View>
            <Text style={styles.alarmText}>Pomodoro finished. Time for a short rest.</Text>
            <Pressable
              onPress={handleDismissAlarm}
              style={({ pressed, hovered }) => [
                styles.okBtn,
                (hovered || pressed) && styles.okBtnPressed,
              ]}>
              <Text style={styles.okBtnText}>OK</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </AppModal>
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 8,
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    time: {
      minWidth: 36,
      fontSize: 13,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      color: colors.primary,
      marginRight: 2,
    },
    btn: {
      width: 26,
      height: 26,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    btnPressed: {
      backgroundColor: colors.todoHighlight,
    },
    alarmOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    alarmModal: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: colors.bgContent,
      borderRadius: tokens.borderRadius,
      borderWidth: 1,
      borderColor: colors.borderColor,
      padding: 20,
      gap: 12,
      ...tokens.shadow,
    },
    alarmHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    alarmTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    alarmText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    okBtn: {
      marginTop: 4,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    okBtnPressed: {
      backgroundColor: colors.primaryHover,
    },
    okBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
  });
}
