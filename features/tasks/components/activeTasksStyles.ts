import { StyleSheet } from 'react-native';
import type { AppColors } from '@/shared/constants/theme';
import { CREATE_TASK_FAB_CLEARANCE } from '@/features/tasks/components/form/CreateTaskButton';
import { TASK_LIST_INSET } from '@/features/tasks/components/filters/TaskSearchBar';

export function createActiveTasksStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
      overflow: 'visible',
    },
    contentInset: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: TASK_LIST_INSET,
      paddingTop: TASK_LIST_INSET,
      overflow: 'visible',
    },
    listArea: {
      flex: 1,
      minHeight: 0,
      overflow: 'visible',
    },
    tasksList: {
      flex: 1,
      minHeight: 0,
      overflow: 'visible',
    },
    tasksContent: {
      flexGrow: 1,
    },
    tasksContentPad: {
      paddingBottom: CREATE_TASK_FAB_CLEARANCE,
    },
    tasksContentDragPad: {
      paddingTop: 6,
    },
    tasksContentEmpty: {
      flexGrow: 1,
    },
    itemWrap: {
      width: '100%',
      overflow: 'visible',
    },
    itemHandle: {
      width: '100%',
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
  });
}
