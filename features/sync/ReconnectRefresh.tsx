import { useTasksActions } from '@/features/tasks/TasksContext';
import { usePomodoroActions } from '@/features/pomodoro/PomodoroContext';
import { useOnReconnect } from '@/shared/providers/NetworkContext';

export default function ReconnectRefresh() {
  const { refetch: refetchTasks } = useTasksActions();
  const { refetch: refetchPomodoro } = usePomodoroActions();

  useOnReconnect(() => {
    void refetchTasks();
    void refetchPomodoro();
  });

  return null;
}
