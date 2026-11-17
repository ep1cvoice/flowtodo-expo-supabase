import { StyleSheet } from 'react-native';
import type { AppColors } from '@/shared/constants/theme';
import { CREATE_TASK_FAB_CLEARANCE } from '@/features/tasks/components/form/CreateTaskButton';
import { TASK_LIST_INSET } from '@/features/tasks/components/filters/TaskSearchBar';
import { webInteractive } from '@/shared/lib/pressableWeb';
import { isWeb } from '@/shared/lib/platform';
import { WEB_CALENDAR_COLUMN_MAX } from '@/features/tasks/lib/calendarDate';

export function createCalendarTasksStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
    },
    monthShell: {
      marginHorizontal: -6,
      paddingTop: 8,
      paddingBottom: 4,
      gap: 2,
      backgroundColor: colors.chrome,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderColor,
    },
    // Used when the calendar sits inside the padded task list instead of spanning the screen.
    monthShellInset: {
      marginHorizontal: 0,
      marginBottom: 8,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
      overflow: 'hidden',
      // On wide web layouts the card hugs the capped day grid instead of spanning the list.
      ...(isWeb
        ? { width: '100%', maxWidth: WEB_CALENDAR_COLUMN_MAX * 7 + 24, alignSelf: 'center' }
        : null),
    },
    monthPager: {
      width: '100%',
      overflow: 'hidden',
    },
    handleHit: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 2,
      paddingBottom: 4,
    },
    handlePill: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textMuted,
      opacity: 0.45,
    },
    listInset: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: TASK_LIST_INSET,
      paddingTop: 12,
    },
    monthNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: 8,
    },
    navBtn: {
      padding: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    navBtnPressed: {
      backgroundColor: colors.todoHighlight,
    },
    monthLabel: {
      flexShrink: 1,
      minWidth: 140,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    dot: {
      position: 'absolute',
      bottom: 3,
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    dotMarked: {
      backgroundColor: colors.primary,
    },
    dotEmpty: {
      backgroundColor: 'transparent',
    },
    dotOnSelected: {
      backgroundColor: '#fff',
    },
    dayLabel: {
      marginTop: 14,
      marginBottom: 8,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    tasksList: {
      flex: 1,
      minHeight: 0,
    },
    tasksContent: {
      flexGrow: 1,
      paddingBottom: CREATE_TASK_FAB_CLEARANCE,
    },
    tasksContentEmpty: {
      justifyContent: 'center',
    },
    itemWrap: {
      width: '100%',
    },
    empty: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 28,
      paddingHorizontal: 24,
    },
    emptyIconRing: {
      marginBottom: 6,
      padding: 10,
      borderRadius: 999,
      borderWidth: 8,
      borderColor: colors.todoHighlight,
    },
    emptyIcon: {
      padding: 16,
      borderRadius: 999,
      backgroundColor: colors.primaryLight,
    },
    emptyTitle: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 16,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
  });
}
