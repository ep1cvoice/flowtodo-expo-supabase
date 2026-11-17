import { StyleSheet } from 'react-native';
import type { AppColors } from '@/shared/constants/theme';
import { webInteractive } from '@/shared/lib/pressableWeb';

export type AddTaskStyles = ReturnType<typeof createAddTaskStyles>;

// Extras of the create sheet on top of the task detail sheet styles (taskDetailStyles).
export function createAddTaskStyles(colors: AppColors) {
  return StyleSheet.create({
    titleError: {
      marginTop: -2,
      fontSize: 12.8,
      color: colors.red,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 40,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    submitBtnPressed: {
      backgroundColor: colors.primaryHover,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
