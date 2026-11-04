import { useTasks } from '@/features/tasks/TasksContext';
import { usePomodoro } from '@/features/pomodoro/PomodoroContext';
import { useOnReconnect } from '@/shared/providers/NetworkContext';

export default function ReconnectRefresh() {
  const { refetch: refetchTasks } = useTasks();
  const { refetch: refetchPomodoro } = usePomodoro();

  useOnReconnect(() => {
    void refetchTasks();
    void refetchPomodoro();
  });

  return null;
}
