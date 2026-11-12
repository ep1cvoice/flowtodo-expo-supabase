import { StyleSheet } from 'react-native';
import { tokens, type AppColors } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';
import { memoizeStyles } from '@/shared/lib/memoizeStyles';
import { webInteractive } from '@/shared/lib/pressableWeb';

// Same reds as the pomodoro chip that used to live on the task row.
export const POMO_RED = '#ef4444';
const POMO_BORDER_LIGHT = '#fca5a5';

export function createPomodoroMiniBarStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingLeft: 4,
      paddingRight: 12,
      borderBottomWidth: 1.5,
      borderBottomColor: isDark ? POMO_RED : POMO_BORDER_LIGHT,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.1)',
    },
    body: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      ...webInteractive,
    },
    pressed: { backgroundColor: 'rgba(239, 68, 68, 0.16)' },
    time: {
      fontSize: 15,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      color: POMO_RED,
    },
    title: { flex: 1, fontSize: 13, color: POMO_RED },
    btn: {
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    alarmOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
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
    alarmHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    alarmTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    alarmText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    okBtn: {
      marginTop: 4,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    okBtnPressed: { backgroundColor: colors.primaryHover },
    okBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}

const getStyles = memoizeStyles(createPomodoroMiniBarStyles);

export function usePomodoroMiniBarStyles() {
  const { colors, isDark } = useTheme();
  return { colors, styles: getStyles(colors, isDark) };
}
