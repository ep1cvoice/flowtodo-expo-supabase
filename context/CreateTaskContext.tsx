import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import AddTaskModal from '@/components/tasks/form/AddTaskModal';
import { useTasks } from '@/context/TasksContext';

type ScheduledRoute = 'active' | 'calendar';

type CreateTaskContextValue = {
  setScheduledDay: (route: ScheduledRoute, day: Date | null) => void;
  openCreate: (routeName: string) => void;
};

const CreateTaskContext = createContext<CreateTaskContextValue | null>(null);

export function CreateTaskProvider({ children }: { children: ReactNode }) {
  const { categories, tags, addTask } = useTasks();
  const scheduledRef = useRef<Record<ScheduledRoute, Date | null>>({
    active: null,
    calendar: null,
  });
  const [visible, setVisible] = useState(false);
  const [scheduled, setScheduled] = useState<Date | null>(null);

  const setScheduledDay = useCallback((route: ScheduledRoute, day: Date | null) => {
    scheduledRef.current[route] = day;
  }, []);

  const openCreate = useCallback((routeName: string) => {
    const day =
      routeName === 'active' || routeName === 'calendar'
        ? scheduledRef.current[routeName]
        : null;
    setScheduled(day);
    setVisible(true);
  }, []);

  const value = useMemo(
    () => ({ setScheduledDay, openCreate }),
    [setScheduledDay, openCreate]
  );

  return (
    <CreateTaskContext.Provider value={value}>
      {children}
      <AddTaskModal
        visible={visible}
        onClose={() => setVisible(false)}
        onAdd={addTask}
        categories={categories}
        tags={tags}
        defaultScheduled={scheduled}
      />
    </CreateTaskContext.Provider>
  );
}

export function useCreateTask() {
  const value = useContext(CreateTaskContext);
  if (!value) {
    throw new Error('useCreateTask must be used within CreateTaskProvider');
  }
  return value;
}
