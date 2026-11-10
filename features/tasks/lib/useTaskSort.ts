import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTaskSortMode, type TaskSortMode } from '@/features/tasks/lib/taskSort';

const SORT_STORAGE_KEY = '@flowtodo/active-task-sort';

/** The active-list sort mode, persisted across launches. */
export function useTaskSort() {
  const [sortMode, setSortMode] = useState<TaskSortMode>('manual');

  useEffect(() => {
    AsyncStorage.getItem(SORT_STORAGE_KEY)
      .then((value) => {
        if (isTaskSortMode(value)) setSortMode(value);
      })
      .catch(() => {});
  }, []);

  const handleSelectSort = useCallback((mode: TaskSortMode) => {
    setSortMode(mode);
    AsyncStorage.setItem(SORT_STORAGE_KEY, mode).catch(() => {});
  }, []);

  return { sortMode, handleSelectSort };
}
