import { Pencil } from 'lucide-react-native';
import type { Category, Tag, Task } from '@/types';
import TaskFormModal from '@/components/tasks/form/TaskFormModal';
import type { TaskFormValues } from '@/lib/taskValidation';

export type EditTaskUpdates = TaskFormValues;

interface EditTaskModalProps {
  visible: boolean;
  task: Task;
  onUpdate: (id: number, updates: EditTaskUpdates) => void | Promise<void>;
  onClose: () => void;
  categories: Category[];
  tags: Tag[];
}

export default function EditTaskModal({
  visible,
  task,
  onUpdate,
  onClose,
  categories,
  tags,
}: EditTaskModalProps) {
  return (
    <TaskFormModal
      visible={visible}
      heading="Edit Task"
      submitLabel="Save changes"
      submittingLabel="Saving…"
      SubmitIcon={Pencil}
      categories={categories}
      tags={tags}
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
