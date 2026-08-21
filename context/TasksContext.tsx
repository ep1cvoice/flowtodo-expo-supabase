import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  COMPLETED_PAGE_SIZE,
  completedKeysetOrFilter,
  getCompletedCursor,
  mergeCompletedTasks,
  sortCompletedTasks,
  type CompletedCursor,
} from '@/lib/completedPagination';
import { seedDemoData } from '@/lib/seedDemoData';
import { mapCategory, mapTag, mapTask, type TaskQueryRow } from '@/lib/taskMappers';
import { encryptField, hashForUniqueness } from '@/lib/crypto';
import { requireDek } from '@/lib/taskDek';
import { supabase } from '@/supabase/client';
import type { Category, CategoryIcon, Tag, Task } from '@/types';

export interface AddTaskInput {
  title: string;
  description: string;
  categoryId: number | null;
  tagIds: number[];
  scheduled?: string | null;
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
  completedCount: number;
  hasMoreCompleted: boolean;
  loadingMoreCompleted: boolean;
  categories: Category[];
  tags: Tag[];
  loading: boolean;
  refetch: () => Promise<void>;
  loadMoreCompleted: () => Promise<void>;
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
  title_enc,
  title_iv,
  description,
  description_enc,
  description_iv,
  done,
  scheduled,
  completed_at,
  sort_order,
  category_id,
  created_at,
  updated_at,
  categories ( id, user_id, name, name_enc, name_iv, name_hash, color, icon, created_at ),
  task_tags ( tags ( id, user_id, name, name_enc, name_iv, name_hash, color, created_at ) )
`;

const TasksContext = createContext<TasksContextValue | null>(null);

function mapTaskRows(rows: TaskQueryRow[] | null | undefined, dek: Uint8Array | null): Task[] {
  return (rows ?? []).map((row) => mapTask(row, dek));
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, dek } = useAuth();
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [completedCursor, setCompletedCursor] = useState<CompletedCursor | null>(null);
  const [hasMoreCompleted, setHasMoreCompleted] = useState(false);
  const [loadingMoreCompleted, setLoadingMoreCompleted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const tasks = useMemo(
    () => [...activeTasks, ...completedTasks],
    [activeTasks, completedTasks]
  );

  const fetchCompletedPage = useCallback(
    async (userId: string, cursor: CompletedCursor | null) => {
      let query = supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('user_id', userId)
        .eq('done', true)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(COMPLETED_PAGE_SIZE + 1);

      if (cursor) {
        query = query.or(completedKeysetOrFilter(cursor));
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = mapTaskRows(data as TaskQueryRow[] | null, dek);
      const hasMore = rows.length > COMPLETED_PAGE_SIZE;
      const page = hasMore ? rows.slice(0, COMPLETED_PAGE_SIZE) : rows;
      const nextCursor =
        page.length > 0 ? getCompletedCursor(page[page.length - 1]) : null;

      return { page, hasMore, nextCursor };
    },
    [dek]
  );

  const refresh = useCallback(
    async (userId: string) => {
      const [categoriesRes, tagsRes, activeRes, countRes, completedPage] =
        await Promise.all([
          supabase.from('categories').select('*').eq('user_id', userId).order('name'),
          supabase.from('tags').select('*').eq('user_id', userId).order('name'),
          supabase
            .from('tasks')
            .select(TASK_SELECT)
            .eq('user_id', userId)
            .eq('done', false)
            .order('sort_order', { ascending: true }),
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('done', true),
          fetchCompletedPage(userId, null),
        ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (tagsRes.error) throw tagsRes.error;
      if (activeRes.error) throw activeRes.error;
      if (countRes.error) throw countRes.error;

      const nextCategories = (categoriesRes.data ?? []).map((row) => mapCategory(row, dek));
      const nextTags = (tagsRes.data ?? []).map((row) => mapTag(row, dek));
      const nextActive = mapTaskRows(activeRes.data as TaskQueryRow[] | null, dek);
      const nextCompleted = sortCompletedTasks(completedPage.page);

      setCategories(nextCategories);
      setTags(nextTags);
      setActiveTasks(nextActive);
      setCompletedTasks(nextCompleted);
      setCompletedCount(countRes.count ?? nextCompleted.length);
      setCompletedCursor(completedPage.nextCursor);
      setHasMoreCompleted(completedPage.hasMore);

      return {
        categories: nextCategories,
        tags: nextTags,
        activeTasks: nextActive,
        completedTasks: nextCompleted,
      };
    },
    [fetchCompletedPage, dek]
  );

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setActiveTasks([]);
      setCompletedTasks([]);
      setCompletedCount(0);
      setCompletedCursor(null);
      setHasMoreCompleted(false);
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
          snapshot.activeTasks.length === 0 &&
          snapshot.completedTasks.length === 0;

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

  const loadMoreCompleted = useCallback(async () => {
    if (!user || !hasMoreCompleted || loadingMoreCompleted || !completedCursor) return;

    setLoadingMoreCompleted(true);
    try {
      const { page, hasMore, nextCursor } = await fetchCompletedPage(
        user.id,
        completedCursor
      );
      setCompletedTasks((prev) => mergeCompletedTasks(prev, page));
      setCompletedCursor(nextCursor);
      setHasMoreCompleted(hasMore);
    } catch (err) {
      console.warn('Failed to load more completed:', (err as Error)?.message ?? err);
      throw err;
    } finally {
      setLoadingMoreCompleted(false);
    }
  }, [
    user,
    hasMoreCompleted,
    loadingMoreCompleted,
    completedCursor,
    fetchCompletedPage,
  ]);

  const requireUserId = () => {
    if (!user) throw new Error('Not signed in');
    return user.id;
  };

  const addTask = async ({
    title,
    description,
    categoryId,
    tagIds,
    scheduled = null,
  }: AddTaskInput) => {
    const userId = requireUserId();
    const activeDek = requireDek(dek);

    const minSort = activeTasks.length
      ? Math.min(...activeTasks.map((t) => t.sortOrder)) - 1
      : 0;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    const titleEnc = await encryptField(activeDek, trimmedTitle);
    let descriptionEncFields: { description_enc: string | null; description_iv: string | null } = {
      description_enc: null,
      description_iv: null,
    };
    if (trimmedDescription) {
      const descEnc = await encryptField(activeDek, trimmedDescription);
      descriptionEncFields = { description_enc: descEnc.ciphertext, description_iv: descEnc.iv };
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: '', // plaintext no longer written — real value in title_enc
        description: '', // plaintext no longer written — real value in description_enc
        category_id: categoryId,
        sort_order: minSort,
        done: false,
        title_enc: titleEnc.ciphertext,
        title_iv: titleEnc.iv,
        scheduled: scheduled ?? null,
        ...descriptionEncFields,
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
    const activeDek = requireDek(dek);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    const titleEnc = await encryptField(activeDek, trimmedTitle);
    let descriptionEncFields: { description_enc: string | null; description_iv: string | null } = {
      description_enc: null,
      description_iv: null,
    };
    if (trimmedDescription) {
      const descEnc = await encryptField(activeDek, trimmedDescription);
      descriptionEncFields = { description_enc: descEnc.ciphertext, description_iv: descEnc.iv };
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        title: '', // plaintext no longer written — real value in title_enc
        description: '', // plaintext no longer written — real value in description_enc
        category_id: categoryId,
        title_enc: titleEnc.ciphertext,
        title_iv: titleEnc.iv,
        ...descriptionEncFields,
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

  const patchTaskLocal = (id: number, patch: Partial<Task>) => {
    setActiveTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
    setCompletedTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  };

  const setTaskScheduled = async (id: number, scheduled: string | null) => {
    const userId = requireUserId();
    const { error } = await supabase
      .from('tasks')
      .update({ scheduled })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;

    patchTaskLocal(id, { scheduled });
  };

  const addCategory = async ({ name, color, icon }: AddCategoryInput): Promise<Category> => {
    const userId = requireUserId();
    const activeDek = requireDek(dek);
    const trimmedName = name.trim();

    const nameEnc = await encryptField(activeDek, trimmedName);
    const nameHash = hashForUniqueness(activeDek, trimmedName);

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: '', // plaintext no longer written — real value in name_enc
        color,
        icon: String(icon),
        name_enc: nameEnc.ciphertext,
        name_iv: nameEnc.iv,
        name_hash: nameHash,
      })
      .select('*')
      .single();

    if (error) throw error;
    const category = mapCategory(data, dek);
    setCategories((prev) => [...prev, category]);
    return category;
  };

  const addTag = async ({ name, color }: AddTagInput): Promise<Tag> => {
    const userId = requireUserId();
    const activeDek = requireDek(dek);
    const trimmedName = name.trim();

    const nameEnc = await encryptField(activeDek, trimmedName);
    const nameHash = hashForUniqueness(activeDek, trimmedName);

    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: userId,
        name: '', // plaintext no longer written — real value in name_enc
        color,
        name_enc: nameEnc.ciphertext,
        name_iv: nameEnc.iv,
        name_hash: nameHash,
      })
      .select('*')
      .single();

    if (error) throw error;
    const tag = mapTag(data, dek);
    setTags((prev) => [...prev, tag]);
    return tag;
  };

  const deleteCategory = async (id: number) => {
    const userId = requireUserId();
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;

    setCategories((prev) => prev.filter((c) => c.id !== id));
    const clearCategory = (t: Task): Task =>
      t.categoryId === id ? { ...t, categoryId: null, category: null } : t;
    setActiveTasks((prev) => prev.map(clearCategory));
    setCompletedTasks((prev) => prev.map(clearCategory));
  };

  const deleteTag = async (id: number) => {
    const userId = requireUserId();
    const { error } = await supabase.from('tags').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;

    setTags((prev) => prev.filter((t) => t.id !== id));
    const stripTag = (t: Task): Task => ({
      ...t,
      tags: (t.tags ?? []).filter((tag) => tag.id !== id),
    });
    setActiveTasks((prev) => prev.map(stripTag));
    setCompletedTasks((prev) => prev.map(stripTag));
  };

  const toggleTask = async (id: number) => {
    const userId = requireUserId();
    const current =
      activeTasks.find((t) => t.id === id) ?? completedTasks.find((t) => t.id === id);
    if (!current) return;

    const nextDone = !current.done;
    const nextCompletedAt = nextDone ? new Date().toISOString() : null;
    const nextTask: Task = {
      ...current,
      done: nextDone,
      completedAt: nextCompletedAt,
    };

    if (nextDone) {
      setActiveTasks((prev) => prev.filter((t) => t.id !== id));
      setCompletedTasks((prev) => mergeCompletedTasks([nextTask], prev));
      setCompletedCount((n) => n + 1);
    } else {
      setCompletedTasks((prev) => prev.filter((t) => t.id !== id));
      setActiveTasks((prev) =>
        [...prev, nextTask].sort((a, b) => a.sortOrder - b.sortOrder)
      );
      setCompletedCount((n) => Math.max(0, n - 1));
    }

    const { error } = await supabase
      .from('tasks')
      .update({ done: nextDone, completed_at: nextCompletedAt })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      if (nextDone) {
        setCompletedTasks((prev) => prev.filter((t) => t.id !== id));
        setActiveTasks((prev) =>
          [...prev, current].sort((a, b) => a.sortOrder - b.sortOrder)
        );
        setCompletedCount((n) => Math.max(0, n - 1));
      } else {
        setActiveTasks((prev) => prev.filter((t) => t.id !== id));
        setCompletedTasks((prev) => mergeCompletedTasks([current], prev));
        setCompletedCount((n) => n + 1);
      }
      throw error;
    }
  };

  const deleteTask = async (id: number) => {
    const userId = requireUserId();
    const wasCompleted = completedTasks.some((t) => t.id === id);
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    setActiveTasks((prev) => prev.filter((t) => t.id !== id));
    setCompletedTasks((prev) => prev.filter((t) => t.id !== id));
    if (wasCompleted) setCompletedCount((n) => Math.max(0, n - 1));
  };

  const deleteAllActive = async () => {
    const userId = requireUserId();
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId)
      .eq('done', false);
    if (error) throw error;
    setActiveTasks([]);
  };

  const deleteAllCompleted = async () => {
    const userId = requireUserId();
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId)
      .eq('done', true);
    if (error) throw error;
    setCompletedTasks([]);
    setCompletedCount(0);
    setCompletedCursor(null);
    setHasMoreCompleted(false);
  };

  const reorderTasks = async (items: { id: number; sortOrder: number }[]) => {
    if (items.length === 0) return;
    const userId = requireUserId();
    const previous = activeTasks;
    const orderMap = new Map(items.map((item) => [item.id, item.sortOrder]));

    setActiveTasks((current) =>
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
      setActiveTasks(previous);
      throw failed.error;
    }
  };

  return (
    <TasksContext.Provider
      value={{
        tasks,
        activeTasks,
        completedTasks,
        completedCount,
        hasMoreCompleted,
        loadingMoreCompleted,
        categories,
        tags,
        loading,
        refetch,
        loadMoreCompleted,
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
