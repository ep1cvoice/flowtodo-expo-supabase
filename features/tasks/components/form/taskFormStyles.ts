import { StyleSheet } from 'react-native';
import type { AppColors } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';
import { memoizeStyles } from '@/shared/lib/memoizeStyles';
import { webInteractive } from '@/shared/lib/pressableWeb';

export function createTaskFormStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      maxHeight: '100%',
      flexShrink: 1,
      overflow: 'hidden',
    },
    scroll: {
      flexShrink: 1,
    },
    form: {
      padding: 16,
      gap: 16,
    },
    inputGroup: {
      gap: 8,
    },
    fieldLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    label: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    newLinkBtn: {
      ...webInteractive,
    },
    newLink: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    input: {
      width: '100%',
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      backgroundColor: isDark ? colors.bgSurface : colors.chrome,
      color: colors.textPrimary,
      fontSize: 15,
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    textarea: {
      minHeight: 96,
    },
    inputError: {
      borderColor: colors.red,
      backgroundColor: colors.sidebarLogoutHover,
    },
    inputErrorMsg: {
      marginTop: 2,
      color: colors.red,
      fontSize: 13,
    },
    categoryList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryChip: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
    },
    categoryChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    categoryChipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    categoryChipTextSelected: {
      fontWeight: '600',
      color: colors.primary,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 4,
    },
    btn: {
      minHeight: 48,
      borderRadius: 14,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    cancel: {
      backgroundColor: 'transparent',
    },
    cancelPressed: {
      backgroundColor: colors.bgSurface,
    },
    cancelText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    submit: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    submitPressed: {
      backgroundColor: colors.primaryHover,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    submitText: {
      fontSize: 15,
      color: '#fff',
      fontWeight: '600',
    },
  });
}

export type TaskFormStyles = ReturnType<typeof createTaskFormStyles>;

// One StyleSheet per theme, shared by every component instance.
const getTaskFormStyles = memoizeStyles(createTaskFormStyles);

export function useTaskFormStyles() {
  const { colors, isDark } = useTheme();
  const styles = getTaskFormStyles(colors, isDark);
  return { colors, styles };
}
