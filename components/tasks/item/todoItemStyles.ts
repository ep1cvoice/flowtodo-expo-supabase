import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

export function createTodoItemStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    todoItem: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: colors.bgTodoItem,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderColor,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
      ...webInteractive,
      ...Platform.select({
        web: { boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' } as object,
        default: {
          shadowColor: '#0f172a',
          shadowOpacity: 0.04,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        },
      }),
    },
    itemHovered: {
      borderColor: colors.primary,
      backgroundColor: colors.todoHighlight,
    },
    itemHoveredTinted: {
      borderColor: colors.primary,
    },
    pressed: {
      opacity: 0.96,
    },
    controlPressed: {
      opacity: 0.85,
    },
    todoMainRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      zIndex: 1,
    },
    reorderButtons: {
      marginLeft: -4,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
    },
    reorderBtn: {
      width: 22,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      ...webInteractive,
    },
    reorderBtnPressed: {
      backgroundColor: colors.todoHighlight,
    },
    reorderBtnDisabled: {
      opacity: 0.35,
    },
    todoCheckbox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.bgSurface : '#ffffff',
      ...webInteractive,
    },
    checkboxHovered: {
      backgroundColor: colors.primaryLight,
    },
    checkboxCheckedHovered: {
      backgroundColor: colors.primaryHover,
      borderColor: colors.primaryHover,
    },
    checked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 20,
    },
    todoBody: {
      flex: 1,
      minWidth: 0,
      gap: 8,
      paddingTop: 5,
    },
    titleText: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 22,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    tagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      maxWidth: 180,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 999,
      borderWidth: 1.5,
      backgroundColor: isDark ? colors.bgSurface : '#ffffff',
    },
    
    tagChipText: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 16,
    },
    done: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    sideColumn: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
      gap: 6,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
      gap: 6,
    },
    todoDate: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
      gap: 4,
      minHeight: 29,
      paddingVertical: 2,
      paddingLeft: 6,
      paddingRight: 8,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: isDark ? '#3b82f6' : '#93c5fd',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.22)' : 'rgba(59, 130, 246, 0.1)',
      ...webInteractive,
    },
    todoDateText: {
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 16,
      color: '#3b82f6',
    },
    todoActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    todoActionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    actionPressed: {
      backgroundColor: colors.todoHighlight,
    },
    iconTile: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    categoryMark: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mobilePlus: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mobileOverlay: {
      flex: 1,
      width: '100%',
      height: '100%',
      justifyContent: 'flex-end',
    },
    mobileActionsModal: {
      backgroundColor: colors.bgSurface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderColor: colors.borderColor,
    },
    mobileActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 10,
    },
    mobileActionText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    mobileClose: {
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
  });
}

export type TodoItemStyles = ReturnType<typeof createTodoItemStyles>;

export function useTodoItemStyles() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createTodoItemStyles(colors, isDark), [colors, isDark]);
  return { colors, styles };
}
