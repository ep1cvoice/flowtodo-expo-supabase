export interface UserSettings {
  theme?: string;
  notificationType?: string;
  pomodoroTime?: number;
  view?: string;
}

/** Partial settings payload for `profiles` updates. */
export type ProfileUpdates = Partial<UserSettings>;

export interface User {
  id: string; // uuid
  username: string;
  email: string;
  settings?: UserSettings;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<{ error: string | null }>;
  updatePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  done: boolean;
  scheduled: string | null;
  /** ISO timestamp when marked done; null while active. */
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
  /** Target duration in seconds */
  duration: number;
  /** Accumulated elapsed time in milliseconds (frozen while paused) */
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

export type CategoryIcon =
  | 'Briefcase'
  | 'Home'
  | 'Book'
  | 'Heart'
  | 'Star'
  | 'ShoppingCart'
  | 'Dumbbell'
  | 'Code'
  | 'Music'
  | 'Camera'
  | 'Plane'
  | 'Car'
  | 'Coffee'
  | 'Gamepad2'
  | 'Palette'
  | 'Globe'
  | 'Leaf'
  | 'Zap'
  | 'Target'
  | 'Users';
