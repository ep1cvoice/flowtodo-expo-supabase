import { Pencil } from 'lucide-react-native';
import type { Task } from '@/types';
import TaskFormModal from '@/features/tasks/components/form/TaskFormModal';
import type { TaskFormInput } from '@/features/tasks/lib/types';

interface EditTaskModalProps {
  visible: boolean;
  task: Task;
  onUpdate: (id: number, updates: TaskFormInput) => void | Promise<void>;
  onClose: () => void;
}

export default function EditTaskModal({
  visible,
  task,
  onUpdate,
  onClose,
}: EditTaskModalProps) {
  return (
    <TaskFormModal
      visible={visible}
      heading="Edit Task"
      submitLabel="Save changes"
      submittingLabel="Saving…"
      SubmitIcon={Pencil}
      initialValues={{
        title: task.title,
        description: task.description || '',
        categoryId: task.categoryId,
        tagIds: (task.tags ?? []).map((t) => t.id),
      }}
      syncKey={task}
      disableCloseWhileSubmitting
      failLog="Failed to update task:"
      successToast="Task updated."
      onSubmit={(values) => onUpdate(task.id, values)}
      onClose={onClose}
    />
  );
}
