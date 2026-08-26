export interface UserSettings {
  theme?: string;
  notificationType?: string;
  pomodoroTime?: number;
  view?: string;
  /** Max categories + tags selectable together in Active filters (5–30). */
  maxFilterSelections?: number;
}

export type { CategoryIcon } from '@/constants/categoryIcons';

export type ProfileUpdates = Partial<UserSettings>;

export interface User {
  id: string; // uuid
  username: string;
  email: string;
  settings?: UserSettings;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  done: boolean;
  scheduled: string | null;
  completedAt: string | null;
  created: string;
  categoryId: number | null;
  category: Category | null;
  sortOrder: number;
  tags?: Tag[];
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface PomoData {
  id: number;
  taskId: number;
  startedAt: string;
  endedAt: string | null;
  duration: number;
  elapsed: number;
  pausedAt: string | null;
}

export interface PomoRecord {
  id: number;
  taskId: number;
  taskName: string;
  startedAt: string;
  endedAt: string | null;
  elapsed: number;
  duration: number;
}

export const MAX_TAGS_PER_TASK = 10;
