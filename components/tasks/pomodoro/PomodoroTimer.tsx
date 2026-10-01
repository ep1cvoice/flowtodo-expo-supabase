import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
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

const POMO_BORDER_LIGHT = '#fca5a5';
const POMO_RED = '#ef4444';

function TomatoIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <G transform="translate(0, 512) scale(0.1, -0.1)" fill={color}>
        <Path d="M2266 4942 c-3 -5 10 -55 28 -113 65 -205 96 -415 96 -657 l0 -154 -29 -29 c-43 -42 -82 -37 -140 18 -145 136 -411 186 -656 123 -93 -24 -245 -95 -245 -114 0 -9 16 -17 43 -21 127 -22 318 -105 442 -193 134 -96 163 -138 134 -191 -20 -34 -50 -47 -144 -61 -161 -24 -309 -103 -428 -230 -71 -75 -139 -182 -125 -196 4 -3 51 10 105 30 256 94 580 149 744 126 110 -15 205 -48 233 -80 20 -24 24 -43 29 -139 8 -135 46 -330 87 -443 38 -105 102 -223 121 -223 8 0 36 44 65 100 78 157 127 356 141 574 8 127 21 148 117 179 204 67 481 41 840 -79 81 -28 151 -47 154 -44 16 16 -58 126 -143 210 -72 73 -108 100 -181 138 -91 46 -227 87 -292 87 -45 0 -92 46 -92 90 0 37 34 73 145 152 124 88 315 171 443 193 26 4 42 12 42 21 0 7 -37 32 -83 54 -278 134 -598 115 -878 -53 -106 -63 -129 -67 -168 -28 -16 16 -19 44 -25 227 -4 115 -14 272 -22 350 -14 136 -49 358 -60 376 -7 10 -291 11 -298 0z" />
        <Path d="M1220 3799 c-310 -81 -564 -262 -742 -529 -71 -107 -172 -317 -213 -442 -153 -471 -119 -947 99 -1393 280 -573 859 -1016 1551 -1186 228 -56 374 -72 640 -73 258 0 376 12 592 60 223 49 399 112 603 214 876 439 1338 1306 1160 2173 -67 325 -237 656 -439 857 -145 144 -298 236 -493 299 -140 44 -190 48 -280 21 -78 -23 -228 -89 -228 -99 0 -3 34 -19 76 -35 166 -64 347 -217 449 -380 40 -65 50 -89 53 -136 6 -83 -28 -144 -100 -181 -56 -29 -95 -24 -271 35 -265 89 -476 124 -627 105 -41 -5 -81 -11 -90 -14 -11 -4 -19 -39 -33 -147 -16 -133 -55 -305 -91 -406 -28 -79 -99 -212 -135 -254 -78 -91 -201 -92 -281 -1 -36 41 -107 180 -143 278 -35 99 -74 280 -88 412 -14 127 -5 118 -119 132 -151 19 -363 -16 -626 -105 -175 -59 -215 -64 -272 -35 -98 50 -129 158 -76 264 99 196 300 370 517 448 20 7 37 16 37 20 0 10 -147 74 -224 98 -83 25 -109 26 -206 0z m-656 -1691 c20 -18 30 -44 46 -118 93 -434 341 -785 727 -1028 28 -18 54 -40 57 -48 22 -57 -17 -124 -72 -124 -64 0 -240 127 -408 295 -150 150 -250 291 -338 475 -77 165 -146 394 -146 490 0 68 82 104 134 58z" />
      </G>
    </Svg>
  );
}

function formatTime(total: number): string {
  const safe = Number.isNaN(total) || total < 0 ? 0 : Math.floor(total);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PomodoroTimer({ taskId }: PomodoroTimerProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
      <Pressable onPress={(e) => e.stopPropagation()} style={styles.row}>
        <TomatoIcon size={14} color={POMO_RED} />
        <Text style={styles.time}>{formatTime(seconds)}</Text>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
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
            <Play size={16} color={POMO_RED} />
          ) : (
            <Pause size={16} color={POMO_RED} />
          )}
        </Pressable>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            stopAlarmAndEnd();
          }}
          hitSlop={8}
          style={({ pressed, hovered }) => [
            styles.btn,
            (hovered || pressed) && styles.btnPressed,
          ]}
          accessibilityLabel="End pomodoro">
          <X size={16} color={POMO_RED} />
        </Pressable>
      </Pressable>

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

function createStyles(colors: AppColors, isDark: boolean) {
  const borderColor = isDark ? POMO_RED : POMO_BORDER_LIGHT;
  return StyleSheet.create({
    row: {
      alignSelf: 'flex-start',
      flexShrink: 1,
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 29,
      gap: 4,
      paddingVertical: 2,
      paddingLeft: 6,
      paddingRight: 4,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.1)',
    },
    time: {
      minWidth: 32,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 16,
      fontVariant: ['tabular-nums'],
      color: POMO_RED,
      textAlign: 'center',
    },
    btn: {
      width: 22,
      height: 22,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    btnPressed: {
      backgroundColor: 'rgba(239, 68, 68, 0.16)',
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
