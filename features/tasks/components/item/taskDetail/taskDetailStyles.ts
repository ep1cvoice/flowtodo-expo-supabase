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
    cardWide: {
      maxHeight: '90%',
      minHeight: 420,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.bgSurface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    closeBtn: {
      marginLeft: 'auto',
      padding: 8,
      borderRadius: 999,
      ...webInteractive,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
      ...webInteractive,
    },
    categoryChipHover: {
      backgroundColor: colors.todoHighlight,
    },
    categoryChipText: {
      flexShrink: 1,
    },
    tagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 32,
      borderRadius: 8,
      ...webInteractive,
    },
    tagsText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
    },
    titleInput: {
      margin: 0,
      padding: 0,
      borderWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
    cardFull: {
      height: '100%',
      maxHeight: '100%',
      borderRadius: 0,
      borderWidth: 0,
    },
    overlayFull: {
      padding: 0,
    },
    sheetBodyFull: {
      flex: 1,
    },
    contentFull: {
      flex: 1,
    },
    descriptionWrapFull: {
      flex: 1,
    },
    descriptionFieldFull: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    descriptionInputFull: {
      flex: 1,
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
      paddingVertical: 12,
      gap: 8,
    },
    metaDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderColor,
    },
    tagChip: {
      minHeight: 32,
      flexShrink: 0,
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1.5,
      justifyContent: 'center',
    },
    tagChipText: {
      fontSize: 13,
      fontWeight: '600',
    },
    descriptionWrap: {
      marginHorizontal: 16,
      marginVertical: 12,
    },
    descriptionField: {
      minHeight: 64,
      justifyContent: 'center',
    },
    descriptionGlyph: {
      position: 'absolute',
      alignSelf: 'center',
      opacity: 0.1,
    },
    menuCard: {
      maxHeight: '70%',
      overflow: 'hidden',
    },
    menuScroll: {
      flexShrink: 1,
    },
    menuList: {
      padding: 8,
      gap: 4,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 12,
      ...webInteractive,
    },
    menuRowPressed: {
      backgroundColor: colors.bgCardHover,
    },
    menuDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    menuRowText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    menuEmpty: {
      padding: 12,
      fontSize: 14,
      color: colors.textMuted,
    },
    menuHint: {
      paddingHorizontal: 12,
      paddingTop: 6,
      fontSize: 12,
      color: colors.textMuted,
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
      paddingVertical: 12,
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
    footerGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 0,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      ...webInteractive,
    },
    // Icon button with a text label (e.g. "Due date" in the create sheet).
    labelBtn: {
      width: 'auto',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 12,
    },
    labelBtnText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    iconBtnPressed: {
      backgroundColor: colors.bgCardHover,
    },
    deleteBtnPressed: {
      backgroundColor: colors.sidebarLogoutHover,
    },
  });
}
