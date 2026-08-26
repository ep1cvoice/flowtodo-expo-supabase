import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

export function createTodoItemStyles(colors: AppColors) {
  return StyleSheet.create({
    todoItem: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: colors.bgTodoItem,
      borderRadius: tokens.borderRadius,
      borderWidth: 1,
      borderColor: colors.borderColor,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
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
    hasCategory: {
      paddingRight: 48,
    },
    itemHovered: {
      borderColor: colors.primary,
      backgroundColor: colors.todoHighlight,
    },
    pressed: {
      opacity: 0.96,
    },
    controlPressed: {
      opacity: 0.85,
    },
    categoryGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    categoryBgIcon: {
      position: 'absolute',
      right: 8,
      top: '50%',
      marginTop: -22,
      zIndex: 0,
    },
    todoMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      zIndex: 1,
    },
    todoMainRowExpanded: {
      alignItems: 'flex-start',
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
      width: 24,
      height: 24,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
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
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 16,
    },
    todoBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
      justifyContent: 'center',
    },
    todoText: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    titleText: {
      flex: 1,
      flexShrink: 1,
      minWidth: 48,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 20,
    },
    tagMeta: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
    tagMetaItem: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
    done: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    todoIndicators: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    mobileMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      marginLeft: 34,
      zIndex: 1,
    },
    todoDate: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      ...webInteractive,
      backgroundColor: colors.todoHighlight,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    todoDateHovered: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    todoDateToday: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    todoDatePast: {
      backgroundColor: colors.pink,
      borderColor: colors.red,
    },
    todoDateCompleted: {
      backgroundColor: colors.bgSurface,
      borderColor: colors.borderColor,
    },
    todoDateText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    todoDateTextToday: {
      color: colors.primary,
    },
    todoDateTextPast: {
      color: colors.red,
    },
    todoDateTextCompleted: {
      color: colors.textMuted,
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
    mobileRight: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
      gap: 6,
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
      width: 24,
      height: 24,
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
    descriptionWrapper: {
      marginTop: 8,
      marginLeft: 34,
      zIndex: 1,
    },
    todoDescription: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    mobileOverlay: {
      flex: 1,
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
  const { colors } = useTheme();
  const styles = useMemo(() => createTodoItemStyles(colors), [colors]);
  return { colors, styles };
}
