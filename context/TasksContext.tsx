import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { seedDemoData } from '@/lib/seedDemoData';
import { mapCategory, mapTag, mapTask, type TaskQueryRow } from '@/lib/taskMappers';
import { supabase } from '@/supabase/client';
import type { Category, CategoryIcon, Tag, Task } from '@/types';

export interface AddTaskInput {
  title: string;
  description: string;
  categoryId: number | null;
  tagIds: number[];
}

export type UpdateTaskInput = AddTaskInput;

export interface AddCategoryInput {
  name: string;
  color: string;
  icon: CategoryIcon | string;
}

export interface AddTagInput {
  name: string;
  color: string;
}

interface TasksContextValue {
  tasks: Task[];
  activeTasks: Task[];
  completedTasks: Task[];
  categories: Category[];
  tags: Tag[];
  loading: boolean;
  refetch: () => Promise<void>;
  addTask: (input: AddTaskInput) => Promise<void>;
  updateTask: (id: number, input: UpdateTaskInput) => Promise<void>;
  setTaskScheduled: (id: number, scheduled: string | null) => Promise<void>;
  addCategory: (input: AddCategoryInput) => Promise<Category>;
  addTag: (input: AddTagInput) => Promise<Tag>;
  deleteCategory: (id: number) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  deleteAllActive: () => Promise<void>;
  deleteAllCompleted: () => Promise<void>;
  reorderTasks: (items: { id: number; sortOrder: number }[]) => Promise<void>;
}

const TASK_SELECT = `
  id,
  user_id,
  title,
  description,
  done,
  scheduled,
  completed_at,
  sort_order,
  category_id,
  created_at,
  updated_at,
  categories ( id, user_id, name, color, icon, created_at ),
  task_tags ( tags ( id, user_id, name, color, created_at ) )
`;

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.done).sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks]
  );

  const completedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.done)
        .sort((a, b) => {
          const aAt = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bAt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bAt - aAt;
        }),
    [tasks]
  );

  const refresh = useCallback(async (userId: string) => {
    const [categoriesRes, tagsRes, tasksRes] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', userId).order('name'),
      supabase.from('tags').select('*').eq('user_id', userId).order('name'),
      supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('user_id', userId)
        .order('sort_order', { ascending: true }),
    ]);

    if (categoriesRes.error) throw categoriesRes.error;
    if (tagsRes.error) throw tagsRes.error;
    if (tasksRes.error) throw tasksRes.error;

    const nextCategories = (categoriesRes.data ?? []).map(mapCategory);
    const nextTags = (tagsRes.data ?? []).map(mapTag);
    const nextTasks = ((tasksRes.data ?? []) as TaskQueryRow[]).map(mapTask);

    setCategories(nextCategories);
    setTags(nextTags);
    setTasks(nextTasks);

    return {
      categories: nextCategories,
      tags: nextTags,
      tasks: nextTasks,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setTasks([]);
      setCategories([]);
      setTags([]);
      setLoading(false);
      return;
    }

    const userId = user.id;
    setLoading(true);

    (async () => {
      try {
        const snapshot = await refresh(userId);
        if (cancelled) return;

        const isEmpty =
          snapshot.categories.length === 0 &&
          snapshot.tags.length === 0 &&
          snapshot.tasks.length === 0;

        if (isEmpty) {
          await seedDemoData(userId);
          if (cancelled) return;
          await refresh(userId);
        }
      } catch (err) {
        console.warn('Failed to load tasks domain:', (err as Error)?.message ?? err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, refresh]);

  const refetch = useCallback(async () => {
    if (!user) return;
    try {
      await refresh(user.id);
    } catch (err) {
      console.warn('Failed to refetch tasks domain:', (err as Error)?.message ?? err);
    }
  }, [user, refresh]);

  const requireUserId = () => {
    if (!user) throw new Error('Not signed in');
    return user.id;
  };

  const addTask = async ({ title, description, categoryId, tagIds }: AddTaskInput) => {
    const userId = requireUserId();
    const minSort = activeTasks.length
      ? Math.min(...activeTasks.map((t) => t.sortOrder)) - 1
      : 0;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        sort_order: minSort,
        done: false,
      })
      .select('id')
      .single();

    if (error) throw error;

    if (tagIds.length > 0) {
      const { error: tagError } = await supabase.from('task_tags').insert(
        tagIds.map((tag_id) => ({ task_id: data.id, tag_id }))
      );
      if (tagError) throw tagError;
    }

    await refresh(userId);
  };

  const updateTask = async (
    id: number,
    { title, description, categoryId, tagIds }: UpdateTaskInput
  ) => {
    const userId = requireUserId();

    const { error } = await supabase
      .from('tasks')
      .update({
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    const { error: clearError } = await supabase.from('task_tags').delete().eq('task_id', id);
    if (clearError) throw clearError;

    if (tagIds.length > 0) {
      const { error: tagError } = await supabase
        .from('task_tags')
        .insert(tagIds.map((tag_id) => ({ task_id: id, tag_id })));
      if (tagError) throw tagError;
    }

    await refresh(userId);
  };

  const setTaskScheduled = async (id: number, scheduled: string | null) => {
    const userId = requireUserId();
    const { error } = await supabase
      .from('tasks')
      .update({ scheduled })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, scheduled } : t)));
  };

  const addCategory = async ({ name, color, icon }: AddCategoryInput): Promise<Category> => {
    const userId = requireUserId();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: name.trim(),
        color,
        icon: String(icon),
      })
      .select('*')
      .single();

    if (error) throw error;
    const category = mapCategory(data);
    setCategories((prev) => [...prev, category]);
    return category;
  };

  const addTag = async ({ name, color }: AddTagInput): Promise<Tag> => {
    const userId = requireUserId();
    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: userId,
        name: name.trim(),
        color,
      })
      .select('*')
      .single();

    if (error) throw error;
    const tag = mapTag(data);
    setTags((prev) => [...prev, tag]);
    return tag;
  };

  const deleteCategory = async (id: number) => {
    const userId = requireUserId();
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;

    setCategories((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) =>
      prev.map((t) => (t.categoryId === id ? { ...t, categoryId: null, category: null } : t))
    );
  };

  const deleteTag = async (id: number) => {
    const userId = requireUserId();
    const { error } = await supabase.from('tags').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;

    setTags((prev) => prev.filter((t) => t.id !== id));
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        tags: (t.tags ?? []).filter((tag) => tag.id !== id),
      }))
    );
  };

  const toggleTask = async (id: number) => {
    const userId = requireUserId();
    const current = tasks.find((t) => t.id === id);
    if (!current) return;

    const nextDone = !current.done;
    const nextCompletedAt = nextDone ? new Date().toISOString() : null;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, done: nextDone, completedAt: nextCompletedAt } : t
      )
    );

    const { error } = await supabase
      .from('tasks')
      .update({ done: nextDone, completed_at: nextCompletedAt })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, done: current.done, completedAt: current.completedAt } : t
        )
      );
      throw error;
    }
  };

  const deleteTask = async (id: number) => {
    const userId = requireUserId();
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const deleteAllActive = async () => {
    const userId = requireUserId();
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId)
      .eq('done', false);
    if (error) throw error;
    setTasks((prev) => prev.filter((t) => t.done));
  };

  const deleteAllCompleted = async () => {
    const userId = requireUserId();
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId)
      .eq('done', true);
    if (error) throw error;
    setTasks((prev) => prev.filter((t) => !t.done));
  };

  const reorderTasks = async (items: { id: number; sortOrder: number }[]) => {
    if (items.length === 0) return;
    const userId = requireUserId();
    const previous = tasks;
    const orderMap = new Map(items.map((item) => [item.id, item.sortOrder]));

    setTasks((current) =>
      current.map((task) =>
        orderMap.has(task.id) ? { ...task, sortOrder: orderMap.get(task.id)! } : task
      )
    );

    const results = await Promise.all(
      items.map(({ id, sortOrder }) =>
        supabase.from('tasks').update({ sort_order: sortOrder }).eq('id', id).eq('user_id', userId)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      setTasks(previous);
      throw failed.error;
    }
  };

  return (
    <TasksContext.Provider
      value={{
        tasks,
        activeTasks,
        completedTasks,
        categories,
        tags,
        loading,
        refetch,
        addTask,
        updateTask,
        setTaskScheduled,
        addCategory,
        addTag,
        deleteCategory,
        deleteTag,
        toggleTask,
        deleteTask,
        deleteAllActive,
        deleteAllCompleted,
        reorderTasks,
      }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
