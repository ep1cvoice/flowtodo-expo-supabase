import { StyleSheet } from 'react-native';
import type { AppColors } from '@/shared/constants/theme';
import { webInteractive } from '@/shared/lib/pressableWeb';

export type UnlockGateStyles = ReturnType<typeof createUnlockGateStyles>;

export function createUnlockGateStyles(colors: AppColors) {
  return StyleSheet.create({
    gate: {
      flex: 1,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logout: {
      alignSelf: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      ...webInteractive,
    },
    biometricRetry: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      alignSelf: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      ...webInteractive,
    },
    logoutPressed: {
      backgroundColor: colors.sidebarLogoutHover,
    },
    logoutDisabled: {
      opacity: 0.6,
    },
    logoutText: {
      color: colors.sidebarLogoutText,
      textAlign: 'center',
      fontSize: 15,
      fontWeight: '500',
    },
  });
}
