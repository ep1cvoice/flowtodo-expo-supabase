import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

export function createTaskFormStyles(colors: AppColors) {
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
      padding: 18,
      gap: 16,
    },
    inputGroup: {
      gap: 6,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    label: {
      color: colors.textSecondary,
      fontSize: 15,
      marginBottom: 2,
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
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      color: colors.textPrimary,
      fontSize: 15,
    },
    textarea: {
      minHeight: 88,
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
      gap: 6,
    },
    categoryChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
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
      marginTop: 6,
    },
    btn: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cancel: {
      backgroundColor: 'transparent',
    },
    cancelPressed: {
      backgroundColor: colors.bgSurface,
    },
    cancelText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    submit: {
      backgroundColor: colors.primary,
    },
    submitPressed: {
      backgroundColor: colors.primaryHover,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    submitText: {
      fontSize: 14,
      color: '#fff',
      fontWeight: '600',
    },
  });
}

export type TaskFormStyles = ReturnType<typeof createTaskFormStyles>;

export function useTaskFormStyles() {
  const { colors } = useTheme();
  const styles = useMemo(() => createTaskFormStyles(colors), [colors]);
  return { colors, styles };
}
