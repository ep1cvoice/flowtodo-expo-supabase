import {
  fetchCompletedPage,
  fetchTaskById,
  fetchTasksSnapshot,
} from '@/features/tasks/lib/queries';
import {
  deleteCategoryForUser,
  deleteTagForUser,
  deleteTaskForUser,
  deleteTasksByDone,
  insertEncryptedCategory,
  insertEncryptedTag,
  insertEncryptedTask,
  setTaskCompletedAtRow,
  setTaskScheduledRow,
  updateEncryptedTask,
  updateTaskSortOrders,
} from '@/features/tasks/lib/mutations';
import { seedDemoData } from '@/features/tasks/lib/seedDemoData';
import { IDLE_SYNC_STATUS, type TaskStore } from '@/features/tasks/lib/store/types';

/** Online-only store: every call goes straight to Supabase (the web build). */
export const remoteTaskStore: TaskStore = {
  localFirst: false,
  fetchTasksSnapshot,
  fetchCompletedPage,
  fetchTaskById,
  seedDemoData,
  insertTask: insertEncryptedTask,
  updateTask: updateEncryptedTask,
  insertCategory: insertEncryptedCategory,
  insertTag: insertEncryptedTag,
  deleteCategory: deleteCategoryForUser,
  deleteTag: deleteTagForUser,
  setTaskScheduled: setTaskScheduledRow,
  setTaskCompletedAt: setTaskCompletedAtRow,
  deleteTask: deleteTaskForUser,
  deleteTasksByDone,
  updateSortOrders: updateTaskSortOrders,
  requestSync: () => {},
  flush: async () => {},
  getSyncStatus: () => IDLE_SYNC_STATUS,
  subscribeSyncStatus: () => () => {},
  subscribe: () => () => {},
};
