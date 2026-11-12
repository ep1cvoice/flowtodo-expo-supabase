import { StyleSheet } from 'react-native';
import { tokens, type AppColors } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';
import { memoizeStyles } from '@/shared/lib/memoizeStyles';
import { webInteractive } from '@/shared/lib/pressableWeb';

export function createPomodoroScreenStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      padding: 16,
      paddingTop: 10,
      alignItems: 'center',
    },
    panel: {
      width: '100%',
      maxWidth: 720,
      gap: 10,
    },
    breadcrumb: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 4,
    },
    breadcrumbLink: {
      ...webInteractive,
    },
    breadcrumbLinkPressed: {
      opacity: 0.7,
    },
    breadcrumbLinkText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    breadcrumbCurrent: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: tokens.borderRadius,
      backgroundColor: isDark ? colors.bgTodoItem : colors.bgSurface,
      padding: 16,
      gap: 8,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 4,
    },
    modeGroup: {
      gap: 8,
    },
    modeOption: {
      gap: 2,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      ...webInteractive,
    },
    modeOptionSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    modeOptionHover: {
      backgroundColor: colors.bgTodoItem,
    },
    modeTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modeTitleSelected: {
      color: colors.primary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderColor,
      marginVertical: 6,
    },
    durationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    durationInput: {
      width: 64,
      height: 40,
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: 10,
      backgroundColor: colors.bgSurface,
      color: colors.textPrimary,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
    },
    primaryBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    primaryBtnPressed: {
      backgroundColor: colors.primaryHover,
    },
    primaryBtnDisabled: {
      opacity: 0.6,
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    activeTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    activeTime: {
      fontSize: 40,
      fontWeight: '700',
      color: colors.primary,
      fontVariant: ['tabular-nums'],
    },
    activeActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    secondaryBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      ...webInteractive,
    },
    secondaryBtnText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    statsCol: {
      flex: 1,
      gap: 2,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
    },
    statsPeriod: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    statsValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    statsCaption: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    errorInfo: {
      color: colors.red,
      fontSize: 13,
      fontWeight: '500',
    },
  });
}

const getPomodoroScreenStyles = memoizeStyles(createPomodoroScreenStyles);

export function usePomodoroScreenStyles() {
  const { colors, isDark } = useTheme();
  const styles = getPomodoroScreenStyles(colors, isDark);
  return { colors, styles };
}
