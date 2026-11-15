import { useCallback, useMemo, useState } from 'react';
import type { Task } from '@/types';

// Multi-select state for the task list's action mode. Selection mode is active while at
// least one visible task is selected; deselecting the last one leaves it.
export function useTaskSelection(visibleTasks: Task[]) {
  const [ids, setIds] = useState<number[]>([]);

  const selectedTasks = useMemo(() => {
    const set = new Set(ids);
    return visibleTasks.filter((task) => set.has(task.id));
  }, [ids, visibleTasks]);

  const select = useCallback((id: number) => {
    setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);
  const toggle = useCallback((id: number) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const clear = useCallback(() => setIds([]), []);

  return { selecting: selectedTasks.length > 0, selectedTasks, select, toggle, clear };
}
