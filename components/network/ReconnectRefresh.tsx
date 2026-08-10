import { useTasks } from '@/context/TasksContext';
import { usePomodoro } from '@/context/PomodoroContext';
import { useOnReconnect } from '@/context/NetworkContext';

export default function ReconnectRefresh() {
  const { refetch: refetchTasks } = useTasks();
  const { refetch: refetchPomodoro } = usePomodoro();

  useOnReconnect(() => {
    void refetchTasks();
    void refetchPomodoro();
  });

  return null;
}
