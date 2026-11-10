import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import TaskItemModals, {
  type TaskModalKind,
  type TaskModalVisibility,
} from '@/features/tasks/components/item/TaskItemModals';
import { useTasksState } from '@/features/tasks/TasksContext';
import type { Task } from '@/types';

const CLOSED: TaskModalVisibility = {
  detail: false,
  actions: false,
  confirmDelete: false,
  edit: false,
  calendar: false,
};

type TaskItemModalsContextValue = {
  // Makes `task` the active task and opens the given modal for it.
  open: (kind: TaskModalKind, task: Task) => void;
};

const TaskItemModalsContext = createContext<TaskItemModalsContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void | Promise<void>;
}

// Wraps a task list and renders one TaskItemModals instance for all of its rows.
export function TaskItemModalsProvider({ children, onToggle, onDelete }: ProviderProps) {
  const { tasks } = useTasksState();
  const [snapshot, setSnapshot] = useState<Task | null>(null);
  const [visible, setVisible] = useState<TaskModalVisibility>(CLOSED);

  const show = useCallback((kind: TaskModalKind) => {
    setVisible((prev) => ({ ...prev, [kind]: true }));
  }, []);
  const hide = useCallback((kind: TaskModalKind) => {
    setVisible((prev) => ({ ...prev, [kind]: false }));
  }, []);
  const open = useCallback(
    (kind: TaskModalKind, task: Task) => {
      setSnapshot(task);
      show(kind);
    },
    [show],
  );

  // Follow live updates of the active task; fall back to the snapshot once it is gone
  // (e.g. deleted) so a closing modal keeps rendering.
  const task = snapshot ? (tasks.find((t) => t.id === snapshot.id) ?? snapshot) : null;

  const value = useMemo(() => ({ open }), [open]);

  return (
    <TaskItemModalsContext.Provider value={value}>
      {children}
      {task ? (
        <TaskItemModals
          task={task}
          visible={visible}
          onShow={show}
          onHide={hide}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ) : null}
    </TaskItemModalsContext.Provider>
  );
}

export function useTaskItemModals() {
  const value = useContext(TaskItemModalsContext);
  if (!value) {
    throw new Error('useTaskItemModals must be used within TaskItemModalsProvider');
  }
  return value;
}
