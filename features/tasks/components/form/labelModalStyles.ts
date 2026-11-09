import { StyleSheet } from 'react-native';
import { webInteractive } from '@/shared/lib/pressableWeb';
import type { AppColors } from '@/shared/constants/theme';

export function createLabelModalStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      maxHeight: '90%',
      overflow: 'hidden',
    },
    form: {
      padding: 18,
      gap: 16,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: '500',
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
    inputError: {
      borderColor: colors.red,
      backgroundColor: colors.sidebarLogoutHover,
    },
    inputErrorMsg: {
      color: colors.red,
      fontSize: 13,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    colorOption: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    colorSelected: {
      borderWidth: 2,
      borderColor: '#fff',
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    iconOption: {
      width: 42,
      height: 42,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 4,
    },
    btn: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      ...webInteractive,
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
      fontWeight: '500',
    },
    save: {
      backgroundColor: colors.primary,
    },
    savePressed: {
      backgroundColor: colors.primaryHover,
    },
    saveText: {
      fontSize: 14,
      color: '#fff',
      fontWeight: '600',
    },
  });
}
