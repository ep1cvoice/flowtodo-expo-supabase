import { StyleSheet } from 'react-native';
import type { AppColors } from '@/shared/constants/theme';
import { webInteractive } from '@/shared/lib/pressableWeb';

export const DESC_LINE_HEIGHT = 22;

export type TaskDetailStyles = ReturnType<typeof createTaskDetailStyles>;

export function createTaskDetailStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      maxHeight: '85%',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.bgSurface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 24,
    },
    done: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    sheetBody: {
      flexShrink: 1,
      width: '100%',
    },
    content: {
      flexShrink: 1,
    },
    meta: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 8,
    },
    metaDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderColor,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: 2,
      marginLeft: 'auto',
      maxWidth: '100%',
    },
    tagWrap: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 0,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    tagChip: {
      minHeight: 29,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1.5,
      justifyContent: 'center',
    },
    tagChipText: {
      fontSize: 13,
      fontWeight: '600',
    },
    descriptionField: {
      backgroundColor: isDark ? '#011816' : '#e7e9ea',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    descriptionInput: {
      margin: 0,
      padding: 0,
      borderWidth: 0,
      fontSize: 15,
      lineHeight: DESC_LINE_HEIGHT,
      color: colors.textSecondary,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderColor,
      backgroundColor: isDark ? colors.bgSurface : '#f3f5f4',
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    iconBtn: {
      width: 29,
      height: 29,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      ...webInteractive,
    },
    iconBtnPressed: {
      backgroundColor: colors.bgCardHover,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      ...webInteractive,
    },
    deleteBtnPressed: {
      backgroundColor: colors.sidebarLogoutHover,
    },
    completeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    completeBtnPressed: {
      opacity: 0.88,
    },
    completeBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
  });
}
